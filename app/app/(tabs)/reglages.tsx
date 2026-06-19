import { Spacing } from '@/constants/Spacing';
import { useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Switch, TextInput, Pressable, Alert } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useUnits } from '@/hooks/useUnits';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';
import type { ThemePreference, UnitsPreference, PlateStepValue } from '@/services/settingsUtils';
import { getDb } from '@/db';
import { ExportService } from '@/services/ExportService';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { createNotificationScheduler } from '@/services/createNotificationScheduler';
import { NotificationService } from '@/services/NotificationService';
import type { NotifSettings } from '@/services/NotificationService';

const NOTIF_KEY = 'notif_settings';

async function loadNotifSettings(): Promise<NotifSettings | null> {
  const repo = new SQLiteSettingsRepository(getDb());
  const raw = await repo.get(NOTIF_KEY);
  return raw ? JSON.parse(raw) as NotifSettings : null;
}

async function persistNotifSettings(s: NotifSettings): Promise<void> {
  const repo = new SQLiteSettingsRepository(getDb());
  await repo.set(NOTIF_KEY, JSON.stringify(s));
}

const notifScheduler = createNotificationScheduler();
const notifService = new NotificationService(notifScheduler, loadNotifSettings, persistNotifSettings);

const DEFAULT_NOTIF: NotifSettings = {
  enabled: false,
  isoWeekday: 1,
  hour: 9,
  minute: 0,
  inactivityDays: 7,
};

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

const UNITS_OPTIONS: { value: UnitsPreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'kg', label: 'kg' },
  { value: 'lbs', label: 'lbs' },
];

const PLATE_STEP_OPTIONS_KG: { value: PlateStepValue; label: string }[] = [
  { value: '1', label: '1 kg' },
  { value: '2', label: '2 kg' },
  { value: '2.5', label: '2,5 kg' },
  { value: '5', label: '5 kg' },
];

const PLATE_STEP_OPTIONS_LBS: { value: PlateStepValue; label: string }[] = [
  { value: '1.25', label: '2,5 lbs' },
  { value: '2.5', label: '5 lbs' },
  { value: '5', label: '10 lbs' },
];

function SegmentedControl<T extends string,>({
  options,
  selected,
  onSelect,
  colors,
  isDark,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  colors: typeof Colors.light;
  isDark: boolean;
}) {
  return (
    <View style={[styles.segmented, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {options.map((opt, i) => (
        <PressableA11y
          key={opt.value}
          accessibilityLabel={opt.label}
          accessibilityState={{ selected: selected === opt.value }}
          onPress={() => onSelect(opt.value)}
          style={[
            styles.segment,
            i < options.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
            selected === opt.value && { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <Text style={[
            styles.segmentText,
            { color: colors.text },
          ]}>
            {opt.label}
          </Text>
        </PressableA11y>
      ))}
    </View>
  );
}

function SectionHeader({
  title, helpId, helpText, expandedHelp, onToggleHelp, colors,
}: {
  title: string; helpId: string; helpText: string;
  expandedHelp: string | null; onToggleHelp: (id: string) => void;
  colors: typeof Colors.light;
}) {
  const isOpen = expandedHelp === helpId;
  return (
    <View style={{ marginBottom: Spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
        <PressableA11y
          onPress={() => onToggleHelp(helpId)}
          accessibilityLabel={`Aide — ${title}`}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>(?)</Text>
        </PressableA11y>
      </View>
      {isOpen && (
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FontFamily.regular, marginTop: Spacing.xs, marginBottom: Spacing.xs }}>
          {helpText}
        </Text>
      )}
    </View>
  );
}

export default function ReglagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const themeCtx = useContext(ThemeContext)!;
  const { preference: unitsPref, resolved: resolvedUnits, setUnit } = useUnits();
  const router = useRouter();

  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);
  const toggleHelp = (id: string) => setExpandedHelp(prev => (prev === id ? null : id));

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleDevReset = useCallback(() => {
    Alert.alert(
      'Réinitialiser les données',
      'Supprime toutes les séances, logs et records personnels. Les poids cibles du programme restent inchangés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              const db = getDb();
              await db.execAsync('DELETE FROM personal_records;');
              await db.execAsync('DELETE FROM session_logs;');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  }, []);
  const [deloadWeeksStr, setDeloadWeeksStr] = useState<'4' | '6' | '8'>('4');

  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF);

  useEffect(() => {
    loadNotifSettings().then(s => { if (s) setNotifSettings(s); }).catch(console.error);
  }, []);

  const handleNotifChange = useCallback(async (patch: Partial<NotifSettings>) => {
    const next = { ...notifSettings, ...patch };
    setNotifSettings(next);
    await notifService.saveAndReschedule(next);
  }, [notifSettings]);

  useEffect(() => {
    const repo = new SQLiteSettingsRepository(getDb());
    repo.get('deload_weeks').then(v => {
      if (v === '4' || v === '6' || v === '8') setDeloadWeeksStr(v);
    }).catch(console.error);
  }, []);

  const handleDeloadWeeksChange = useCallback(async (v: '4' | '6' | '8') => {
    setDeloadWeeksStr(v);
    const repo = new SQLiteSettingsRepository(getDb());
    await repo.set('deload_weeks', v);
  }, []);

  const [plateStepValue, setPlateStepValue] = useState<PlateStepValue>('2');

  useEffect(() => {
    const repo = new SQLiteSettingsRepository(getDb());
    repo.get('plate_step').then(v => {
      const valid: PlateStepValue[] = ['1', '1.25', '2', '2.5', '5'];
      if (v && valid.includes(v as PlateStepValue)) {
        setPlateStepValue(v as PlateStepValue);
      }
    }).catch(console.error);
  }, []);

  const handlePlateStepChange = useCallback(async (v: PlateStepValue) => {
    setPlateStepValue(v);
    const repo = new SQLiteSettingsRepository(getDb());
    await repo.set('plate_step', v);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const service = new ExportService(getDb());
      await service.exportAll();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export impossible. Réessaie.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <SectionHeader
        title="APPARENCE"
        helpId="apparence"
        helpText="L'app s'adapte automatiquement à ton système, ou tu choisis manuellement Clair ou Sombre."
        expandedHelp={expandedHelp}
        onToggleHelp={toggleHelp}
        colors={colors}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SegmentedControl
          options={THEME_OPTIONS}
          selected={themeCtx.preference}
          onSelect={(v) => { themeCtx.setTheme(v); }}
          colors={colors}
          isDark={isDark}
        />
        {themeCtx.preference === 'system' && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Actuellement : {themeCtx.resolved === 'dark' ? 'Sombre' : 'Clair'}
          </Text>
        )}
      </View>

      <SectionHeader
        title="UNITÉS"
        helpId="unites"
        helpText="Choisis entre kilogrammes et livres. Tous les poids s'adaptent."
        expandedHelp={expandedHelp}
        onToggleHelp={toggleHelp}
        colors={colors}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SegmentedControl
          options={UNITS_OPTIONS}
          selected={unitsPref}
          onSelect={(v) => { setUnit(v); }}
          colors={colors}
          isDark={isDark}
        />
        {unitsPref === 'system' && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Actuellement : {resolvedUnits}
          </Text>
        )}
      </View>

      <SectionHeader
        title="DÉCHARGE AUTOMATIQUE"
        helpId="decharge"
        helpText="Après X semaines consécutives, une semaine allégée est suggérée automatiquement."
        expandedHelp={expandedHelp}
        onToggleHelp={toggleHelp}
        colors={colors}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
          {"Semaines d'entraînement avant de suggérer une semaine de décharge"}
        </Text>
        <SegmentedControl
          options={[
            { value: '4' as const, label: '4 sem.' },
            { value: '6' as const, label: '6 sem.' },
            { value: '8' as const, label: '8 sem.' },
          ]}
          selected={deloadWeeksStr}
          onSelect={handleDeloadWeeksChange}
          colors={colors}
          isDark={isDark}
        />
      </View>

      <SectionHeader
        title="PROGRESSION"
        helpId="progression"
        helpText="Le pas de plaque détermine l'incrément de poids automatique à chaque progression réussie."
        expandedHelp={expandedHelp}
        onToggleHelp={toggleHelp}
        colors={colors}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
          Incrément minimal lors des calculs de poids (décharge, échauffement)
        </Text>
        <SegmentedControl
          options={resolvedUnits === 'lbs' ? PLATE_STEP_OPTIONS_LBS : PLATE_STEP_OPTIONS_KG}
          selected={plateStepValue}
          onSelect={handlePlateStepChange}
          colors={colors}
          isDark={isDark}
        />
      </View>

      <SectionHeader
        title="DONNÉES"
        helpId="donnees"
        helpText="Exporte l'ensemble de tes données en JSON pour sauvegarde personnelle."
        expandedHelp={expandedHelp}
        onToggleHelp={toggleHelp}
        colors={colors}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <PressableA11y
          accessibilityLabel="Exporter toutes mes données d'entraînement au format JSON"
          onPress={handleExport}
          disabled={isExporting}
          style={[styles.exportRow, { opacity: isExporting ? 0.5 : 1 }]}
        >
          <View style={styles.exportInfo}>
            <Text style={[styles.exportLabel, { color: colors.text }]}>Exporter mes données</Text>
            <Text style={[styles.exportMeta, { color: colors.textSecondary }]}>Sauvegarde complète (JSON)</Text>
          </View>
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.exportArrow, { color: colors.textSecondary }]}>→</Text>
          )}
        </PressableA11y>
        {exportError && (
          <Text style={[styles.exportError, { color: colors.destructiveText }]}>{exportError}</Text>
        )}
      </View>

      <SectionHeader
        title="NOTIFICATIONS"
        helpId="notifications"
        helpText="Un rappel hebdomadaire optionnel. Jamais d'alerte pour une séance manquée."
        expandedHelp={expandedHelp}
        onToggleHelp={toggleHelp}
        colors={colors}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Activer les rappels</Text>
          <Switch
            value={notifSettings.enabled}
            onValueChange={(v) => { void handleNotifChange({ enabled: v }); }}
            accessibilityLabel="Activer les rappels de séance"
          />
        </View>

        {notifSettings.enabled && (
          <>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Jour du rappel</Text>
            <View style={styles.chips}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label, i) => {
                const iso = i + 1;
                const selected = notifSettings.isoWeekday === iso;
                return (
                  <Pressable
                    key={iso}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      selected && { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => { void handleNotifChange({ isoWeekday: iso }); }}
                    accessibilityLabel={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Heure</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
                value={String(notifSettings.hour).padStart(2, '0')}
                onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 0 && n <= 23) void handleNotifChange({ hour: n }); }}
                keyboardType="numeric"
                maxLength={2}
                accessibilityLabel="Heure de rappel"
              />
              <Text style={[styles.timeSep, { color: colors.text }]}>:</Text>
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
                value={String(notifSettings.minute).padStart(2, '0')}
                onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 0 && n <= 59) void handleNotifChange({ minute: n }); }}
                keyboardType="numeric"
                maxLength={2}
                accessibilityLabel="Minute de rappel"
              />
            </View>

            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{"Rappel d'inactivité"}</Text>
            <View style={styles.chips}>
              {[3, 5, 7, 14].map((days) => {
                const selected = notifSettings.inactivityDays === days;
                return (
                  <Pressable
                    key={days}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      selected && { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => { void handleNotifChange({ inactivityDays: days }); }}
                    accessibilityLabel={`${days} jours`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{days}j</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>À PROPOS</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <PressableA11y
          onPress={() => router.push('/onboarding?review=true' as any)}
          style={styles.exportRow}
          accessibilityLabel="Revoir l'introduction"
          accessibilityRole="button"
        >
          <Text style={[styles.label, { color: colors.text }]}>Revoir l'introduction</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
        </PressableA11y>
      </View>

      <Pressable
        onLongPress={handleDevReset}
        delayLongPress={1000}
        accessibilityLabel={`Version ${Constants.expoConfig?.version ?? '—'}`}
        accessibilityHint="Appuyer longuement pour réinitialiser les données de test"
        style={styles.versionRow}
      >
        {isResetting ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
            v{Constants.expoConfig?.version ?? '—'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl, gap: Spacing.sm },
  sectionTitle: { fontSize: 11, fontFamily: FontFamily.semibold, letterSpacing: LetterSpacing.wide, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  card: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.lg, gap: Spacing.md },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md },
  segmentText: { fontSize: 14, fontFamily: FontFamily.regular },
  hint: { fontSize: 12, textAlign: 'center' },
  exportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportInfo: { flex: 1, gap: 2 },
  exportLabel: { fontSize: 15, fontFamily: FontFamily.regular },
  exportMeta: { fontSize: 12 },
  exportArrow: { fontSize: 18, fontFamily: FontFamily.semibold, marginLeft: Spacing.sm },
  exportError: { fontSize: 13, marginTop: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontFamily: FontFamily.regular },
  subLabel: { fontSize: 13, marginTop: Spacing.md, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xs, borderWidth: 1 },
  chipText: { fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeInput: { width: 48, textAlign: 'center', fontSize: 16, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
  timeSep: { fontSize: 20 },
  versionRow: { alignItems: 'center', paddingVertical: Spacing.lg },
  versionLabel: { fontSize: 12, fontFamily: FontFamily.regular },
});
