// Minimal jsdom environment polyfills for react-native-web component tests.

// react-native-web uses requestAnimationFrame for layout effects
if (typeof globalThis.requestAnimationFrame !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}
