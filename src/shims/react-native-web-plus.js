// re-export RN-web but also provide TurboModuleRegistry for libs that import it from 'react-native'
export * from 'react-native-web';
import * as RNW from 'react-native-web';

export const TurboModuleRegistry = {
  get: () => null,
  getEnforcing: () => new Proxy({}, { get: () => () => {} }),
};

export default RNW;