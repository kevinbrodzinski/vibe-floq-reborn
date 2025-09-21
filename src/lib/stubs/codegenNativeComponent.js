// Minimal web stub: returns a component factory that renders nothing
export default function codegenNativeComponent(/* name, options */) {
  return function Noop(/* props */) {
    return null;
  };
}