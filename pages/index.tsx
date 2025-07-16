import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  // Redirect to dashboard if already authenticated
  if (ready && authenticated) {
    router.push('/dashboard');
    return null;
  }

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to ThirdStorage
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your wallet or sign in with email, socials, and more
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="text-center">
            <button
              type="button"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              onClick={handleLogin}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Sign In with Privy
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Choose from multiple authentication methods:
            </p>
            <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-400">
              <span>📧 Email</span>
              <span>🔗 Social</span>
              <span>👛 Wallet</span>
              <span>🔐 Passkey</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
