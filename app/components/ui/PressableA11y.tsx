import { Pressable, PressableProps, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface PressableA11yProps extends Omit<PressableProps, 'accessibilityLabel' | 'style'> {
  accessibilityLabel: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  style?: StyleProp<ViewStyle>;
}

export function PressableA11y({
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
  children,
  ...rest
}: PressableA11yProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[styles.base, style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
  },
});
