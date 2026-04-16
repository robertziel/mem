import React from 'react';
import { Text } from 'react-native';

// In unit tests we care that the component does not throw and that the
// markdown source text ends up in the tree. The real library is only
// needed at runtime on device.
export default function Markdown({ children }: { children: string }) {
  return React.createElement(Text, null, children);
}
