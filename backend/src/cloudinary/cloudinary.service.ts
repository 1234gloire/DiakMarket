import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/**
 * NestJS never proxies raw image/video bytes: Flutter uploads directly to Cloudinary using a
 * short-lived signed payload obtained here, then calls back with the resulting URL/public_id
 * so we can persist metadata only (see ProductImage, DisputeEvidence, Profile.avatarPublicId...).
 */
@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  createSignedUploadParams(folder: string): SignedUploadParams {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      cloudinary.config().api_secret as string,
    );

    return {
      cloudName: cloudinary.config().cloud_name as string,
      apiKey: cloudinary.config().api_key as string,
      timestamp,
      signature,
      folder,
    };
  }

  async destroy(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
