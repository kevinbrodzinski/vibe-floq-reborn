import 'dotenv/config';
import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'floqsocial',
  slug: 'floqsocial',
  plugins: ['@rnmapbox/maps', ...(config.plugins || [])],
  extra: {
    ...config.extra,
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
  },
});