import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-white/20 border-t-white mx-auto"></div>
          <p className="mt-6 text-white/80 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-white/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-white/4 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Logo Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 mb-6">
              <Image src="/logo.svg" alt="ThirdStorage" width={40} height={40} className="filter invert" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Third<span className="text-white/70">Storage</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Decentralized storage built on Codex. 
              <br />Connect and start storing your files securely.
            </p>
          </div>

          {/* Login Card */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl">
            <div className="space-y-6">
              <button
                type="button"
                className="group relative w-full flex justify-center items-center py-4 px-6 rounded-xl text-black bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                onClick={handleLogin}
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect with Privy
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-br from-black via-zinc-900 to-black text-white/60">
                    Multiple authentication options
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="text-2xl mb-2">📧</div>
                  <div className="text-white/80 text-sm font-medium">Email</div>
                </div>
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="text-2xl mb-2">🔗</div>
                  <div className="text-white/80 text-sm font-medium">Social</div>
                </div>
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="text-2xl mb-2">👛</div>
                  <div className="text-white/80 text-sm font-medium">Wallet</div>
                </div>
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="text-2xl mb-2">🔐</div>
                  <div className="text-white/80 text-sm font-medium">Passkey</div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-6 text-white/40 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Decentralized
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Secure
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Fast
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
