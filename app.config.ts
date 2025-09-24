/**
 * Expo config with Mapbox plugin + env passthrough
 */
import 'dotenv/config';
import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'floq social',
  slug: 'floq',
  runtimeVersion: { policy: 'appVersion' },
  updates: { fallbackToCacheTimeout: 0 },
  plugins: [
    ...(config.plugins ?? [])
  ],
  extra: {
    ...config.extra,
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
  },
});