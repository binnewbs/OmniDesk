/**
 * Downscales a photo in the browser before upload. Phone photos are often
 * 5–10 MB; a receipt stays legible at 1600px, and the smaller upload is
 * faster and fits the server action body limit.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
}
