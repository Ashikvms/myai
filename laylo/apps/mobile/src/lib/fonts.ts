/**
 * Bricolage Grotesque font loader for BillBee mobile.
 *
 * Pulls the variable family from `@expo-google-fonts/bricolage-grotesque`
 * (TTF files shipped inside the package — no network at runtime). We
 * load four weights: Regular (400), Medium (500), SemiBold (600), Bold
 * (700). Display surfaces use SemiBold/Bold; body copy uses Regular.
 *
 * Call `useBricolageFont()` from the root layout (or any provider that
 * lives above the navigator) and gate splash dismissal on the returned
 * `fontsLoaded`. Components that consume `tokens.fontFamily` will start
 * rendering with the OS fallback and silently swap once the TTFs hydrate.
 */
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';

export function useBricolageFont(): boolean {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });
  return fontsLoaded;
}
