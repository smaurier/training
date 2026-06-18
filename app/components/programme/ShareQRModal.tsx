import { Spacing } from '@/constants/Spacing';
import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  visible: boolean;
  base64: string;         // payload compressé
  programName: string;
  onClose: () => void;
}

const QR_SIZE = 240;

export function ShareQRModal({ visible, base64, programName, onClose }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const url = `app://import?data=${base64}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{`Partager "${programName}"`}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {"L'autre personne scanne ce QR avec sa caméra ou l'app"}
          </Text>

          <View
            style={styles.qrWrapper}
            accessible
            accessibilityLabel={`QR code pour partager le programme ${programName}`}
          >
            <QRCode value={url} size={QR_SIZE} />
          </View>

          <PressableA11y
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Fermer"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtnText, { color: colors.onPrimary }]}>Fermer</Text>
          </PressableA11y>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  card: { borderRadius: 16, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: Spacing.xxl },
  qrWrapper: { padding: Spacing.lg, backgroundColor: '#fff', borderRadius: Radius.lg, marginBottom: Spacing.xxl },
  closeBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxxl, borderRadius: Radius.lg },
  closeBtnText: { fontWeight: '700', fontSize: 16 },
});
