import { Platform } from 'react-native';

/**
 * Compresses an image URI to ≤400 px max-width, 80 % JPEG.
 * Returns a new { uri, width, height } object.
 * Only works on native platforms.
 */
export async function compressImageNative(uri: string) {
  if (Platform.OS === 'web') {
    throw new Error('compressImageNative is only available on native platforms');
  }
  
  const ImageManipulator = require('expo-image-manipulator');
  const manip = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manip;           // { uri, width, height }
}