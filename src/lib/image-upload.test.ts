import { describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({
  uploadFile: vi.fn().mockResolvedValue("http://127.0.0.1:54321/storage/v1/object/public/product-images/categories/abc/cover.png"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
}));

import { buildImagePath, extractStoragePath, uploadEntityImage } from "./image-upload";

function fakeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: "image",
    originalname: "cover.png",
    encoding: "7bit",
    mimetype: "image/png",
    size: 1024,
    buffer: Buffer.from("fake"),
    stream: undefined as never,
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

describe("uploadEntityImage", () => {
  it("appends a cache-busting version query param to the uploaded URL", async () => {
    const url = await uploadEntityImage("categories/abc/cover.png", fakeFile());
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\/public\/product-images\/categories\/abc\/cover\.png\?v=\d+$/);
  });

  it("produces a different URL on a second upload to the same fixed path", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1000);
      const first = await uploadEntityImage("categories/abc/cover.png", fakeFile());
      vi.setSystemTime(2000);
      const second = await uploadEntityImage("categories/abc/cover.png", fakeFile());
      // Same underlying storage path (overwritten via upsert), but the
      // returned URL must differ so a browser/CDN doesn't serve stale bytes.
      expect(first).not.toBe(second);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an unsupported MIME type before uploading", async () => {
    await expect(
      uploadEntityImage("categories/abc/cover.txt", fakeFile({ mimetype: "text/plain" })),
    ).rejects.toThrow(/unsupported image format/i);
  });

  it("rejects a file over the size limit", async () => {
    await expect(
      uploadEntityImage("categories/abc/cover.png", fakeFile({ size: 10 * 1024 * 1024 })),
    ).rejects.toThrow(/exceeds/i);
  });
});

describe("buildImagePath", () => {
  it("builds a deterministic per-entity path from the file's extension", () => {
    expect(buildImagePath("categories", "abc-123", "cover", fakeFile({ originalname: "photo.JPG" }))).toBe(
      "categories/abc-123/cover.jpg",
    );
  });
});

describe("extractStoragePath", () => {
  it("extracts the path from a plain Supabase public URL", () => {
    expect(
      extractStoragePath("https://x.supabase.co/storage/v1/object/public/product-images/categories/abc/cover.png"),
    ).toBe("categories/abc/cover.png");
  });

  it("strips a cache-busting query string when extracting the path", () => {
    expect(
      extractStoragePath("https://x.supabase.co/storage/v1/object/public/product-images/categories/abc/cover.png?v=1785033095708"),
    ).toBe("categories/abc/cover.png");
  });

  it("returns null for a non-Supabase-storage URL", () => {
    expect(extractStoragePath("https://images.unsplash.com/photo-123")).toBeNull();
  });
});
