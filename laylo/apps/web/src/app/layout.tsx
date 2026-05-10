import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from './providers';

// Single typeface — Fraunces variable. Axes: opsz (optical size auto-tuned
// per element), SOFT (0=sharp body / 100=round display), WONK (0=clean /
// 1=quirky display only). Body uses sharp/clean defaults; headings opt
// into the soft+wonky display vibe via .heading classes in globals.css.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz', 'SOFT', 'WONK'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Laylo — Your bumblebee for life's admin",
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
      <body className={`${fraunces.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
