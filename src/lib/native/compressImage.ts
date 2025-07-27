import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compresses an image URI to ≤400 px max-width, 80 % JPEG.
 * Returns a new { uri, width, height } object.
 */
export async function compressImageNative(uri: string) {
  const manip = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manip;           // { uri, width, height }
}