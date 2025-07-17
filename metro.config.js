const path = require('path');

module.exports = {
  resolver: {
    extraNodeModules: {
      '@entry': path.resolve(__dirname, 'src/main.native.tsx'),
    },
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'svg', 'gif', 'webp'],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
  },
};