// Used if any react-native-svg/lib/module/fabric/*NativeComponent.js or *Module.js slips through.
// Export a Noop component for NativeComponent files and empty objects for Module files
export default function Noop(_props: any) { return null; }

// For Module files that export named exports
export const RNSVGRenderableModule = {};
export const RNSVGViewManager = {};
export const RNSVGNodeManager = {};