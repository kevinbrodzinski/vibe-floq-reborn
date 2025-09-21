// Used if any react-native-svg/lib/module/fabric/*NativeComponent.js slips through.
// Export a Noop component so imports don't crash.
export default function Noop(_props: any) { return null; }