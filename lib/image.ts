const MAX_SIDE = 1600;
const MAX_BYTES = 3 * 1024 * 1024;

// Resize + JPEG-compress in the browser so the upload stays under Vercel's request body limit.
// Returns base64 without the data: prefix.
export async function compressImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  for (let q = 0.8; q >= 0.4; q -= 0.1) {
    const b64 = canvas.toDataURL("image/jpeg", q).split(",")[1];
    if (b64.length * 0.75 <= MAX_BYTES) return b64;
  }
  throw new Error("too_large");
}
