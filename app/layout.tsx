import { QrwcProvider } from './lib/QrwcProvider';
import ConditionalLayout from './components/ConditionalLayout';
import './globals.css';

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