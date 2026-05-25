import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from './providers';

// Single typeface — Bricolage Grotesque variable. Axes: opsz (optical size
// auto-tunes per element from 12→96), wdth (held at 100 throughout). The
// trick: same letterforms read clean and editorial at body sizes, warm and
// playful at display sizes. See LAYOUT_REDESIGN_BRIEF.md §1 for the full
// type scale + axis intent.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  axes: ['opsz', 'wdth'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "BillBee — Your bumblebee for life's admin",
  description:
    'Track bills, subscriptions, reminders, appointments, and documents in one calm, intelligent workspace.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
