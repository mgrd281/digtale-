import { Readable } from "node:stream";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "./env.server";

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint || undefined,
      forcePathStyle: env.s3.forcePathStyle,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      },
    });
  }
  return client;
}

export async function uploadFile(
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType?: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export interface DownloadStream {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

export async function getFileStream(storageKey: string): Promise<DownloadStream> {
  const result = await s3().send(
    new GetObjectCommand({ Bucket: env.s3.bucket, Key: storageKey }),
  );
  return {
    stream: result.Body as Readable,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    await s3().send(
      new HeadObjectCommand({ Bucket: env.s3.bucket, Key: storageKey }),
    );
    return true;
  } catch {
    return false;
  }
}
