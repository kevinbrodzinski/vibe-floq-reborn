module.exports = function (api) {
  api.cache(true);
  
  const isNative = process.env.TARGET === 'native' || process.env.PLATFORM === 'native';
  
  return {
    presets: [
      'babel-preset-expo',
    ],
    plugins: [
      // Transform import.meta for React Native compatibility
      ...(isNative ? [
        ['babel-plugin-transform-import-meta', {
          module: 'src/lib/rn-compat',
        }],
      ] : []),
      
      // Module resolver for @/ alias
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './src',
        },
      }],
      
      // Export namespace support
      '@babel/plugin-proposal-export-namespace-from',
      
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};