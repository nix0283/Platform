import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trading Platform — Аналог TradingView',
  description: 'Профессиональная торговая платформа для криптобирж',
  keywords: ['trading', 'crypto', 'bitcoin', 'charting', 'technical analysis'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
