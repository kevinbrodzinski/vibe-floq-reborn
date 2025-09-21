// Stub for React Native's codegenNativeComponent
// This is used by react-native-svg fabric components that don't work on web

export default function codegenNativeComponent(name) {
  // Return a minimal component that renders nothing on web
  // This satisfies react-native-svg fabric components that try to use native components
  return function StubComponent(props) {
    return null;
  };
}