import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../src/lib/tokens';
import { BeeStanding } from '../src/components/illustrations/bee';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <BeeStanding size={120} />
      <Text style={styles.title}>Laylo</Text>
      <Text style={styles.subtitle}>Your bumblebee for life&apos;s admin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: tokens.text,
  },
  subtitle: {
    fontSize: 15,
    color: tokens.textMuted,
  },
});
