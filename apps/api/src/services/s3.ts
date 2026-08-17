import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: env.AWS_ACCESS_KEY_ID
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    : undefined,
});

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Returns a short-lived presigned PUT URL so the client uploads the image
 * bytes directly to S3 — the API never proxies the binary. Final
 * compression + CDN distribution happens via an S3-triggered pipeline
 * (out of scope for the API itself).
 */
export async function createPresignedUpload(folder: string, contentType: string): Promise<PresignedUpload> {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw AppError.badRequest("UNSUPPORTED_IMAGE_TYPE", "Only JPEG, PNG, or WebP images are allowed");
  }
  if (!env.AWS_S3_BUCKET) {
    throw AppError.badRequest("S3_NOT_CONFIGURED", "Image storage is not configured on this server");
  }

  const extension = contentType.split("/")[1];
  const key = `${folder}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const cdnBase = env.AWS_S3_CDN_BASE_URL || `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`;

  return { uploadUrl, publicUrl: `${cdnBase}/${key}`, key };
}
