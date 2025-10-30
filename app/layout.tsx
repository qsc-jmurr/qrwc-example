import { QrwcProvider } from './lib/QrwcProvider';
import ConditionalLayout from './components/ConditionalLayout';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QRWC Example App',
  icons: [
    { rel: 'icon', url: '/logo-icon.svg' },
    { rel: 'shortcut icon', url: '/logo-icon.svg' },
    { rel: 'apple-touch-icon', url: '/logo-icon.svg' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QrwcProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </QrwcProvider>
      </body>
    </html>
  )
}