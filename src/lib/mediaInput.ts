export const IMAGE_FILE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

const supportedImageMimeTypes = new Set(IMAGE_FILE_ACCEPT.split(','));
const supportedImageName = /\.(?:png|jpe?g|gif|webp)$/i;

export function isSupportedImageFile(file: Pick<File, 'name' | 'type'>) {
  return supportedImageMimeTypes.has(file.type.toLowerCase()) || supportedImageName.test(file.name);
}

export function supportedImageFiles(files: ArrayLike<File> | readonly File[]) {
  return Array.from(files).filter(isSupportedImageFile);
}
