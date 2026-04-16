import { act, renderHook } from '@testing-library/react';

import { useDebouncedValue } from '../app/hooks/useDebouncedValue';

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — search must wait until the user has been
// idle for 500 ms before it runs. Fast keystrokes must not re-fire search.
// ---------------------------------------------------------------------------
describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value synchronously on mount', () => {
    const { result } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: 'hello' },
    });
    expect(result.current).toBe('hello');
  });

  it('does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: '' } },
    );
    rerender({ value: 'r' });
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('');
  });

  it('emits the latest value once the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: '' } },
    );
    rerender({ value: 'ruby' });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('ruby');
  });

  it('debounces: rapid updates within the window all collapse into the final value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: '' } },
    );
    rerender({ value: 'r' });
    act(() => jest.advanceTimersByTime(100));
    rerender({ value: 'ru' });
    act(() => jest.advanceTimersByTime(100));
    rerender({ value: 'rub' });
    act(() => jest.advanceTimersByTime(100));
    rerender({ value: 'ruby' });
    // still within the window from the last keystroke — no emission yet
    act(() => jest.advanceTimersByTime(400));
    expect(result.current).toBe('');
    // after the full 500ms idle window, we get the LAST value
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('ruby');
  });

  it('respects the configured delay (300 ms)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: '' } },
    );
    rerender({ value: 'x' });
    act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe('');
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe('x');
  });

  it('clears the pending timer on unmount (no late emissions)', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: '' } },
    );
    rerender({ value: 'late' });
    unmount();
    // After unmount, advancing timers must not throw or try to setState
    expect(() => act(() => jest.advanceTimersByTime(1000))).not.toThrow();
    expect(result.current).toBe(''); // never updated
  });
});
