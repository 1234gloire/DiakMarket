import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module.js';
import { CloudinaryModule } from './cloudinary/cloudinary.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CountriesModule } from './countries/countries.module.js';
import { CitiesModule } from './cities/cities.module.js';
import { AddressesModule } from './addresses/addresses.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { OffersModule } from './offers/offers.module.js';
import { CartsModule } from './carts/carts.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { StoresModule } from './stores/stores.module.js';
import { PromotionsModule } from './promotions/promotions.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { CommissionsModule } from './commissions/commissions.module.js';
import { LedgerModule } from './ledger/ledger.module.js';
import { WithdrawalsModule } from './withdrawals/withdrawals.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { CouriersModule } from './couriers/couriers.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { DisputesModule } from './disputes/disputes.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL_MS') ?? 60000,
            limit: config.get<number>('THROTTLE_LIMIT') ?? 100,
          },
        ],
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    PrismaModule,
    CloudinaryModule,
    AuthModule,
    UsersModule,

    // Reference / multi-country config
    CountriesModule,
    CitiesModule,
    AddressesModule,

    // Catalog
    CategoriesModule,
    ProductsModule,
    FavoritesModule,
    OffersModule,

    // Marketplace / pro sellers
    StoresModule,
    PromotionsModule,
    ConversationsModule,

    // Checkout
    CartsModule,
    OrdersModule,

    // Finance
    PaymentsModule,
    CommissionsModule,
    LedgerModule,
    WithdrawalsModule,

    // Logistics
    DeliveriesModule,
    CouriersModule,

    // Trust & safety
    ReviewsModule,
    DisputesModule,
    ReportsModule,

    // Notifications
    NotificationsModule,

    // Admin
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
