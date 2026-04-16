import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Returns the current software-keyboard height in points, or 0 when no
 * keyboard is open. Used to lift absolutely-positioned UI (like our
 * fixed bottom search bar) above the keyboard on iOS.
 *
 * On web, Keyboard is a no-op (the browser handles focus-scroll for us),
 * so this hook simply returns 0.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // iOS fires `willShow/willHide` slightly before the animation so we
    // can animate in lockstep. Android only reliably fires `didShow`.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event?.endCoordinates?.height ?? 0;
      setInset(height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}
