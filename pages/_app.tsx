import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { PrivyProvider } from '@privy-io/react-auth';
import { Figtree } from 'next/font/google';

// Configure Figtree font with stable configuration
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export default function App({ Component, pageProps }: AppProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error('NEXT_PUBLIC_PRIVY_APP_ID environment variable is required');
  }
  
    return (
    <main className={figtree.className}>
      <PrivyProvider
        appId={appId}
        config={{
          // Create embedded wallets for users who don't have a wallet
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets'
            }
          },
          // Configure authentication methods
          loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord', 'github', 'linkedin'],
          // Customize the modal appearance
          appearance: {
            theme: 'light',
            accentColor: '#3B82F6',
            showWalletLoginFirst: false // Show email/social login first
          }
        }}
      >
        <Component {...pageProps} />
      </PrivyProvider>
    </main>
  );
}
