import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface NearbyCourier {
  courierId: string;
  userId: string;
  distanceMeters: number;
}

/**
 * Raw-SQL PostGIS access. Prisma has no native geography type, so `courier_locations.location`
 * and `delivery_zones.boundary` are declared `Unsupported(...)` in schema.prisma and can only be
 * read/written here via $queryRaw/$executeRaw — see the comment on those schema fields.
 */
@Injectable()
export class PostGisService {
  constructor(private readonly prisma: PrismaService) {}

  async recordCourierLocation(courierId: string, latitude: number, longitude: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO courier_locations (id, "courierId", location, "recordedAt")
      VALUES (
        ${randomUUID()},
        ${courierId},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        now()
      )
    `;
  }

  /** Available, verified couriers with a known location within `radiusMeters` of the given
   * point, nearest first. Each courier's most recent recorded location is used. */
  async findNearbyAvailableCouriers(latitude: number, longitude: number, radiusMeters: number): Promise<NearbyCourier[]> {
    return this.prisma.$queryRaw<NearbyCourier[]>`
      SELECT c.id AS "courierId", c."userId" AS "userId", ST_Distance(latest.location, target.point) AS "distanceMeters"
      FROM couriers c
      JOIN LATERAL (
        SELECT location FROM courier_locations cl WHERE cl."courierId" = c.id ORDER BY cl."recordedAt" DESC LIMIT 1
      ) latest ON true
      CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS point) target
      WHERE c."isAvailable" = true
        AND c."isVerified" = true
        AND ST_DWithin(latest.location, target.point, ${radiusMeters})
      ORDER BY "distanceMeters" ASC
      LIMIT 20
    `;
  }

  /** Great-circle distance in meters between two points, computed in Postgres so it matches
   * exactly what ST_DWithin/ST_Distance above would report (avoids a separate JS haversine
   * implementation drifting from the PostGIS one). */
  async distanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ distance: number }[]>`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${toLng}, ${toLat}), 4326)::geography
      ) AS distance
    `;
    return rows[0]?.distance ?? 0;
  }

  /** A courier's most recently recorded position, extracted back out of the geography column
   * (ST_X/ST_Y) since Prisma can't select `Unsupported` columns directly. */
  async getCourierLastLocation(courierId: string): Promise<{ latitude: number; longitude: number } | null> {
    const rows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
      FROM courier_locations
      WHERE "courierId" = ${courierId}
      ORDER BY "recordedAt" DESC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return { latitude: rows[0].lat, longitude: rows[0].lng };
  }

  /** Deliveries still waiting for a courier (SEARCHING_COURIER), within `radiusMeters` of the
   * given point, nearest first — the "job board" a courier browses. */
  async findOpenDeliveriesNear(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<{ deliveryId: string; distanceMeters: number }[]> {
    return this.prisma.$queryRaw<{ deliveryId: string; distanceMeters: number }[]>`
      SELECT d.id AS "deliveryId", ST_Distance(
        ST_SetSRID(ST_MakePoint(d."pickupLongitude", d."pickupLatitude"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS "distanceMeters"
      FROM deliveries d
      WHERE d.status = 'SEARCHING_COURIER'
        AND d."pickupLatitude" IS NOT NULL AND d."pickupLongitude" IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(d."pickupLongitude", d."pickupLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY "distanceMeters" ASC
      LIMIT 20
    `;
  }
}
