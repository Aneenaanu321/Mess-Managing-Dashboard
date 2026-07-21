import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { env } from "./env";

export const s3Bucket = env.S3_BUCKET || "rfidcore-files";

export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: "us-east-1", // MinIO ignores region but the SDK requires one
  forcePathStyle: true, // required for MinIO (path-style, not virtual-hosted-style) URLs
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: env.S3_SECRET_KEY || "minioadmin",
  },
});

let bucketEnsured = false;

/** Creates the bucket on first use — MinIO doesn't auto-create it, and this keeps local/dev setup to just `docker compose up`. */
export async function ensureBucket() {
  if (bucketEnsured) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: s3Bucket }));
  }
  bucketEnsured = true;
}
