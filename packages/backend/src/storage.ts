import { BlobServiceClient } from "@azure/storage-blob";
import { randomBytes } from "node:crypto";
import { ApiError } from "./http.js";

const CONTAINER_NAME = "documents";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "text/csv": "csv",
};

let cachedClient: BlobServiceClient | null = null;

function getBlobService() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new ApiError(
      503,
      "Document storage is not configured on this environment.",
    );
  }
  if (!cachedClient) {
    cachedClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return cachedClient;
}

export function isStorageConfigured() {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING);
}

/**
 * Uploads a base64-encoded document to Azure Blob Storage and returns its
 * public URL. File names are randomized; the original name survives only in
 * the content-disposition metadata.
 */
export async function uploadDocument({
  fileName,
  contentType,
  dataBase64,
}: {
  fileName: string;
  contentType: string;
  dataBase64: string;
}) {
  const extension = ALLOWED_CONTENT_TYPES[contentType];
  if (!extension) {
    throw new ApiError(
      400,
      `contentType must be one of: ${Object.keys(ALLOWED_CONTENT_TYPES).join(", ")}.`,
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataBase64, "base64");
  } catch {
    throw new ApiError(400, "dataBase64 must be valid base64 content.");
  }
  if (buffer.length === 0) {
    throw new ApiError(400, "The uploaded file is empty.");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new ApiError(400, "Files must be 8 MB or smaller.");
  }

  const container = getBlobService().getContainerClient(CONTAINER_NAME);
  await container.createIfNotExists({ access: "blob" });

  const safeName = fileName.replace(/[^\w.\- ]/g, "_").slice(0, 120);
  const blobName = `${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`;
  const blob = container.getBlockBlobClient(blobName);
  await blob.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobContentDisposition: `inline; filename="${safeName}"`,
    },
  });

  return { url: blob.url, blobName, size: buffer.length, fileName: safeName };
}
