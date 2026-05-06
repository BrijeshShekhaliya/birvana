"use client";

const ONE_MB = 1024 * 1024;
const TARGET_BYTES = Math.floor(1.7 * ONE_MB);
const HARD_LIMIT_BYTES = 2 * ONE_MB;
const QUALITY_STEPS = [0.92, 0.88, 0.84, 0.8, 0.76, 0.72];
const MAX_DIMENSION_STEPS = [1600, 1400, 1200, 1080, 960];

type PreparedCoverImageResult =
  | {
      kind: "ready";
      file: File;
      compressed: boolean;
      originalSize: number;
      finalSize: number;
    }
  | {
      kind: "error";
      message: string;
    };

function replaceExtension(name: string, extension: string) {
  return name.replace(/\.[^/.]+$/u, "") + extension;
}

function formatMegabytes(bytes: number) {
  return `${(bytes / ONE_MB).toFixed(2)} MB`;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the selected image."));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

export async function prepareCoverImage(file: File): Promise<PreparedCoverImageResult> {
  if (!file.type.startsWith("image/")) {
    return {
      kind: "error",
      message: "Cover image must be an image file.",
    };
  }

  if (file.size <= TARGET_BYTES) {
    return {
      kind: "ready",
      file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    for (const maxDimension of MAX_DIMENSION_STEPS) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        break;
      }

      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);

        if (!blob) {
          continue;
        }

        if (blob.size <= TARGET_BYTES) {
          return {
            kind: "ready",
            file: new File([blob], replaceExtension(file.name, ".webp"), {
              type: "image/webp",
              lastModified: Date.now(),
            }),
            compressed: true,
            originalSize: file.size,
            finalSize: blob.size,
          };
        }
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    kind: "error",
    message: `This image is still too large after optimization. Use a cover under ${formatMegabytes(HARD_LIMIT_BYTES)}.`,
  };
}

export function describeCoverOptimization(originalSize: number, finalSize: number) {
  return `Cover optimized from ${formatMegabytes(originalSize)} to ${formatMegabytes(finalSize)}.`;
}
