import { Spacing } from '@/constants/Spacing';
import { Radius } from '@/constants/Radius';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useRef, useCallback, useMemo, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface AddProgrammeBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateBlank: () => void;
  onImportTemplate: () => void;
}

export function AddProgrammeBottomSheet({
  isVisible,
  onClose,
  onCreateBlank,
  onImportTemplate,
}: AddProgrammeBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%'], []);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.container}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            onClose();
            onCreateBlank();
          }}
          accessibilityLabel="Créer un programme vide"
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="add-circle-outline" size={22} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>Créer un programme vide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            onClose();
            onImportTemplate();
          }}
          accessibilityLabel="Importer un template"
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="download-outline" size={22} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>Importer un template</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 44,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
