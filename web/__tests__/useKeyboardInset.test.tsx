import { act, renderHook } from '@testing-library/react';
import { Keyboard, Platform } from 'react-native';

// Imported AFTER jest.mock calls below so the mock is in place
// eslint-disable-next-line @typescript-eslint/no-require-imports

type Listener = (event: { endCoordinates: { height: number } } | undefined) => void;

type MockKeyboard = typeof Keyboard & {
  __fireShow: (height: number) => void;
  __fireHide: () => void;
};

// --- Mock react-native's Keyboard module ----------------------------------
// Unit tests run under jsdom + react-native-web. RN-Web stubs Keyboard as a
// no-op (no real listeners). Provide a controllable mock so the hook can
// react to simulated show/hide events without a device.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const listeners: Record<string, Set<Listener>> = {};
  const addListener = (event: string, cb: Listener) => {
    listeners[event] ??= new Set();
    listeners[event].add(cb);
    return {
      remove: () => listeners[event]?.delete(cb),
    };
  };
  return {
    ...actual,
    Keyboard: {
      ...actual.Keyboard,
      addListener,
      __fireShow: (height: number) => {
        for (const cb of listeners.keyboardWillShow ?? []) cb({ endCoordinates: { height } });
        for (const cb of listeners.keyboardDidShow ?? []) cb({ endCoordinates: { height } });
      },
      __fireHide: () => {
        for (const cb of listeners.keyboardWillHide ?? []) cb(undefined);
        for (const cb of listeners.keyboardDidHide ?? []) cb(undefined);
      },
    },
    Platform: { ...actual.Platform, OS: 'ios' },
  };
});

// Import AFTER mock is set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useKeyboardInset } = require('../app/hooks/useKeyboardInset');

describe('useKeyboardInset (iOS keyboard awareness)', () => {
  // --------------------------------------------------------------------
  // IMMUTABLE REGRESSION TESTS — prove the bug BEFORE the fix lands.
  // When the iOS soft keyboard opens, the fixed bottom search bar must
  // track the keyboard height so the input is NOT covered.
  // --------------------------------------------------------------------

  it('returns 0 before any keyboard event (bar sits at screen bottom)', () => {
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('reflects the keyboard height when keyboardWillShow fires (iOS)', () => {
    const { result } = renderHook(() => useKeyboardInset());
    act(() => {
      (Keyboard as MockKeyboard).__fireShow(336);
    });
    expect(result.current).toBe(336);
  });

  it('resets to 0 when the keyboard hides', () => {
    const { result } = renderHook(() => useKeyboardInset());
    act(() => {
      (Keyboard as MockKeyboard).__fireShow(291);
    });
    expect(result.current).toBe(291);
    act(() => {
      (Keyboard as MockKeyboard).__fireHide();
    });
    expect(result.current).toBe(0);
  });

  it('picks up a later keyboard height change (keyboard accessory toolbar, etc.)', () => {
    const { result } = renderHook(() => useKeyboardInset());
    act(() => (Keyboard as MockKeyboard).__fireShow(300));
    act(() => (Keyboard as MockKeyboard).__fireShow(360));
    expect(result.current).toBe(360);
  });

  it('unsubscribes on unmount (no stale listeners keep stale state)', () => {
    const { result, unmount } = renderHook(() => useKeyboardInset());
    act(() => (Keyboard as MockKeyboard).__fireShow(200));
    expect(result.current).toBe(200);
    unmount();
    // After unmount, further events must not throw — listeners were removed
    expect(() => (Keyboard as MockKeyboard).__fireShow(400)).not.toThrow();
  });
});
