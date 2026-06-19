import { Svg, Circle, G, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface CircularTimerProps {
  progress: number;
  remaining: number;
  label?: string;
  size?: number;
}

function formatTime(seconds: number): string {
  const n = Math.max(0, Math.round(seconds));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CircularTimer({ progress, remaining, label, size = 160 }: CircularTimerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const strokeWidth = 10;
  const cx = size / 2;
  const cy = size / 2;
  const radius = cx - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const isDone = clamped <= 0;
  const dashOffset = isDone ? 0 : circumference * (1 - clamped);
  const fontSize = Math.round(size * 0.22);

  return (
    <Svg
      width={size}
      height={size}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <G rotation="-90" origin={`${cx}, ${cy}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={[circumference]}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
        />
      </G>
      <SvgText
        x={cx}
        y={label ? cy - size * 0.04 : cy + size * 0.06}
        textAnchor="middle"
        fill={colors.text}
        fontSize={fontSize}
        fontWeight="700"
      >
        {formatTime(remaining)}
      </SvgText>
      {label ? (
        <SvgText
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          fill={colors.textSecondary}
          fontSize={Math.round(size * 0.07)}
          fontWeight="600"
        >
          {label.toUpperCase()}
        </SvgText>
      ) : null}
    </Svg>
  );
}
