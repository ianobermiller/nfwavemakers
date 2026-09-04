const AVATAR_SIZE = 128;

/**
 * Loads a user-selected file into a decoded <img>, resolving once it's ready to
 * draw. The resolved element's `src` is a live object URL; the caller owns it and
 * must `URL.revokeObjectURL(img.src)` when done (e.g. so it can still be used as
 * an <img> source while a crop UI is open).
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/** A square region of the source image, in source-pixel coordinates. */
export interface CropRect {
  sx: number;
  sy: number;
  size: number;
}

/** Renders the given square crop of an image to a 128×128 WebP blob. */
export function cropImageToWebP(img: HTMLImageElement, crop: CropRect): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    ctx.drawImage(img, crop.sx, crop.sy, crop.size, crop.size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image'));
      },
      'image/webp',
      0.85,
    );
  });
}
