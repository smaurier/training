import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontFamily, LetterSpacing } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Radius } from '@/constants/Radius';

interface Props {
  children: ReactNode;
  onBack: () => void;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export class SessionPhaseErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[SessionPhaseErrorBoundary]', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Erreur dans la séance</Text>
          {this.state.message && (
            <Text style={styles.detail}>{this.state.message}</Text>
          )}
          <Pressable style={styles.retryBtn} onPress={this.handleRetry}>
            <Text style={styles.retryLabel}>RÉESSAYER</Text>
          </Pressable>
          <Pressable style={styles.backBtn} onPress={this.props.onBack}>
            <Text style={styles.backLabel}>QUITTER LA SÉANCE</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  detail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#444444',
  },
  retryLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: LetterSpacing.max,
    color: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  backLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    letterSpacing: LetterSpacing.wide,
    color: '#888888',
  },
});
