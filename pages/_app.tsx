'use client';

import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { PrivyProvider } from '@privy-io/react-auth';

export default function App({ Component, pageProps }: AppProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmd541qbd03idl20m9fupm1pz";
  
  return (
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
  );
}
