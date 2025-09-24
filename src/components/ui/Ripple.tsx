import { MouseEvent, useRef } from 'react';

export function withRipple<T extends object>(
  Comp: React.ComponentType<T>,
) {
  return function RippleComponent(props: T) {
    const ref = useRef<HTMLDivElement>(null);

    const addRipple = (e: MouseEvent) => {
      const node = ref.current;
      if (!node) return;

      const circle = document.createElement('span');
      const diameter = Math.max(node.clientWidth, node.clientHeight);
      const radius = diameter / 2;
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - node.offsetLeft - radius}px`;
      circle.style.top = `${e.clientY - node.offsetTop - radius}px`;
      circle.className =
        'absolute animate-ripple bg-white/40 rounded-full pointer-events-none';
      node.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    };

    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        onClick={addRipple}
      >
        <Comp {...props} />
      </div>
    );
  };
}