import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  generateUploadSignature(folder: string) {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      timestamp,
      folder,
      invalidate: true,
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      this.config.get('CLOUDINARY_API_SECRET')!,
    );

    return {
      signature,
      timestamp,
      cloudName: this.config.get('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.config.get('CLOUDINARY_API_KEY'),
      folder,
    };
  }

  async verifyAssetExists(publicId: string): Promise<{ bytes: number; mediaType: string }> {
    try {
      const result = await cloudinary.api.resource(publicId, { resource_type: 'auto' });
      return { bytes: result.bytes, mediaType: result.resource_type };
    } catch {
      throw new BadRequestException(`Asset not found: ${publicId}`);
    }
  }

  getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.url(publicId, {
      type: 'upload',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });
  }

  async deleteAsset(publicId: string) {
    return cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'auto' });
  }

  async deleteFolder(folderPath: string) {
    await cloudinary.api.delete_resources_by_prefix(folderPath, { resource_type: 'image' });
    await cloudinary.api.delete_resources_by_prefix(folderPath, { resource_type: 'video' });
  }
}
