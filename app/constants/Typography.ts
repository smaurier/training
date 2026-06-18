export const FontFamily = {
  black:    'Inter_900Black',
  bold:     'Inter_700Bold',
  semibold: 'Inter_600SemiBold',
  medium:   'Inter_500Medium',
  regular:  'Inter_400Regular',
} as const;

export const LetterSpacing = {
  tighter: -1,   // hero title
  tight:   -0.3, // body dense
  wide:     0.5, // structural labels
  wider:    0.8, // chips / tags
  widest:   1,   // general labels
  spaced:   1.6, // section headers uppercase
  max:      2,   // CTA uppercase
} as const;

export const Typography = {
  display:    { fontSize: 32, fontFamily: 'Inter_900Black' as const },
  title:      { fontSize: 20, fontFamily: 'Inter_700Bold' as const },
  heading:    { fontSize: 17, fontFamily: 'Inter_600SemiBold' as const },
  body:       { fontSize: 15, fontFamily: 'Inter_400Regular' as const },
  bodyMedium: { fontSize: 15, fontFamily: 'Inter_500Medium' as const },
  label:      { fontSize: 13, fontFamily: 'Inter_600SemiBold' as const },
  caption:    { fontSize: 11, fontFamily: 'Inter_400Regular' as const },
  micro:      { fontSize: 9,  fontFamily: 'Inter_700Bold' as const },
} as const;
