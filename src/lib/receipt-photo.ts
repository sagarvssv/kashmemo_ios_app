import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Receipts only need to be legible: longest side 2000 px and JPEG quality 0.7
// turns a 3-5 MB phone photo into roughly 300-600 KB. That uploads several times
// faster, reads faster, and stays within the OCR service's size limits.
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.7;

export type PreparedImage = { uri: string; fileName: string; contentType: 'image/jpeg' };

// Resizes (never enlarges) and re-encodes any image the device can decode - JPEG,
// PNG, HEIC - as a JPEG. Rendering also bakes in the camera's orientation.
export async function prepareReceiptImage(uri: string, baseName = 'receipt'): Promise<PreparedImage> {
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) > MAX_SIDE) {
    const resized = ImageManipulator.manipulate(image).resize(
      image.width >= image.height ? { width: MAX_SIDE } : { height: MAX_SIDE },
    );
    image = await resized.renderAsync();
  }
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  const name = baseName.replace(/\.[^.]+$/, '') || 'receipt';
  return { uri: result.uri, fileName: `${name}.jpg`, contentType: 'image/jpeg' };
}
