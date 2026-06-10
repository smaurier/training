import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <>
      <Stack.Screen options={{ title: 'Page introuvable' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Page introuvable</Text>
        <Link href="/" style={[styles.link, { borderColor: colors.border }]}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Retour à l&apos;accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  link: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  linkText: { fontSize: 15, fontWeight: '500' },
});
