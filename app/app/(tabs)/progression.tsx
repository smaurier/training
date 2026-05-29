import { SectionList, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { SessionCard } from '@/components/history/SessionCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SessionSummary } from '@/services/HistoryService';

export default function ProgressionScreen() {
  const { sections, isLoading, error, refresh } = useHistory();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item: SessionSummary) => String(item.id)}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push({ pathname: '/history/[id]' as any, params: { id: String(item.id) } })}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Aucune séance enregistrée
            </Text>
          </View>
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : undefined}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyContainer: { flex: 1 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: { fontSize: 15, textAlign: 'center' },
});
