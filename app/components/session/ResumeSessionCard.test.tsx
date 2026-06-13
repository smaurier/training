import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResumeSessionCard } from './ResumeSessionCard';

jest.mock('@/components/useColorScheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/components/ui/PressableA11y', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require('react-native');
  return {
    PressableA11y: ({ onPress, children, accessibilityLabel, ...rest }: any) => (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        {...rest}
      >
        {children}
      </Pressable>
    ),
  };
});

describe('ResumeSessionCard', () => {
  it('affiche le nom du workout et le serieLabel', () => {
    const { getByText } = render(
      <ResumeSessionCard
        workoutName="PPL Push"
        serieLabel="2 séries complétées"
        onPress={() => {}}
      />
    );
    expect(getByText('PPL Push')).toBeTruthy();
    expect(getByText('2 séries complétées')).toBeTruthy();
  });

  it('appelle onPress au tap', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ResumeSessionCard
        workoutName="PPL Push"
        serieLabel="2 séries complétées"
        onPress={onPress}
      />
    );
    fireEvent.press(getByText('Reprendre →'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
