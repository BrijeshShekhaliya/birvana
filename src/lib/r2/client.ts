import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { hasR2Env, requireServerEnv } from "@/lib/env";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireServerEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireServerEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireServerEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function getBucket() {
  return requireServerEnv("R2_BUCKET");
}

export function getPublicR2BaseUrl() {
  return requireServerEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
}

export function keyFromUrl(url: string) {
  const base = getPublicR2BaseUrl();

  if (!url.startsWith(base)) {
    return null;
  }

  return decodeURIComponent(url.slice(base.length + 1));
}

export async function putObjectToR2(options: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}) {
  if (!hasR2Env()) {
    throw new Error("R2 environment variables are missing.");
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      ContentDisposition: options.contentType.startsWith("audio/") ? "inline" : undefined,
      CacheControl: options.cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );

  return `${getPublicR2BaseUrl()}/${encodeURIComponent(options.key)}`;
}

export async function getObjectFromR2(key: string, range?: string) {
  const client = getR2Client();

  return client.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Range: range,
    }),
  );
}

export async function deleteObjectFromR2(key: string) {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}
