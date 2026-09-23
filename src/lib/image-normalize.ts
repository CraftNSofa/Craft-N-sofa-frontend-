export async function normalizeSquareImage(file: File, size = 1024): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file');

  const bitmap = await createImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.round((bitmap.width - sourceSize) / 2);
  const sourceY = Math.round((bitmap.height - sourceSize) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not prepare the image');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not process the image')), 'image/jpeg', 0.92);
  });
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  return new File([blob], `${baseName}-1024x1024.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
