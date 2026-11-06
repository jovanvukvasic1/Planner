const MAX_SIZE = 1600;
const QUALITY = 0.82;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // imageOrientation: postuje EXIF orijentaciju (fotografije s telefona)
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* probaj preko <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Smanjuje sliku na najvise 1600px po duzoj strani i pretvara je u JPEG,
 * da bi upload s telefona bio brz i da slike ne zauzimaju puno prostora.
 */
export async function compressImage(file: File): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error("Ovaj format slike nije podržan. Izaberi JPEG, PNG ili WebP.");
  }
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_SIZE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  // bijela pozadina za providne PNG slike (JPEG nema providnost)
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("Obrada slike nije uspjela");
  return blob;
}
