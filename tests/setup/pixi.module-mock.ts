// tests/setup/pixi.module-mock.ts
// Module-level mock for pixi.js used in jsdom tests via Vite alias.

type Fn = (...args: any[]) => any;

const makeFn = () => ((..._args: any[]) => undefined) as Fn;

const makeContainer = () => ({
  addChild: makeFn(),
  removeChild: makeFn(),
  removeChildren: makeFn(),
  children: [] as any[],
  on: makeFn(),
  off: makeFn(),
  eventMode: 'auto' as const,
  interactive: true,
});

export class Application {
  stage = makeContainer();
  ticker = {
    start: makeFn(),
    stop: makeFn(),
    add: makeFn(),
    remove: makeFn(),
    FPS: 60,
  };
  renderer = {
    resize: makeFn(),
    clear: makeFn(),
  };
  view = { style: {} as any };
  async init(): Promise<void> { /* no-op */ }
  destroy = makeFn();
}

export class Container { constructor() { return makeContainer() as any; } }
export class ParticleContainer { constructor() { return makeContainer() as any; } }

export class Graphics {
  clear = makeFn();
  beginFill = makeFn();
  drawCircle = makeFn();
  endFill = makeFn();
  lineStyle = makeFn();
  position = { set: makeFn() };
  visible = true;
}

export class Sprite {
  anchor = { set: makeFn() };
  position = { set: makeFn() };
  scale = { set: makeFn() };
  tint = 0xffffff;
  alpha = 1;
  visible = true;
}

export const BLEND_MODES = { ADD: 1 };
export const Texture = {
  WHITE: {},
};

