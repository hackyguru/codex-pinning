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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-600"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image src="/white.svg" alt="ThirdStorage" width={20} height={20} className="filter invert" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://docs.thirdstorage.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors text-sm"
              >
                Documentation
              </a>
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-20 pb-16 text-center lg:pt-32">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Decentralized Storage
              <br />
              <span className="text-zinc-400">Built for Scale</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-zinc-400 leading-8">
              ThirdStorage provides reliable, secure, and scalable decentralized storage built on the Codex network. 
              Store your files with confidence knowing they're distributed across a robust peer-to-peer network.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={handleLogin}
                className="px-6 py-3 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-semibold text-lg"
              >
                Start Storing Now
              </button>
              <a
                href="https://docs.thirdstorage.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-zinc-300 transition-colors font-semibold text-lg"
              >
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="py-24 bg-zinc-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Why Choose ThirdStorage?
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Built on cutting-edge decentralized technology with enterprise-grade reliability.
              </p>
            </div>

            <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Secure & Private</h3>
                <p className="text-zinc-400 leading-6">
                  Your data is encrypted and distributed across multiple nodes, ensuring privacy and security without single points of failure.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Lightning Fast</h3>
                <p className="text-zinc-400 leading-6">
                  Optimized for performance with global CDN-like access patterns and intelligent data routing for minimal latency.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Redundant Storage</h3>
                <p className="text-zinc-400 leading-6">
                  Automatic replication across multiple nodes ensures 99.9% uptime and protects against data loss.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Developer Friendly</h3>
                <p className="text-zinc-400 leading-6">
                  Simple REST API, comprehensive documentation, and multiple SDKs make integration effortless.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Cost Effective</h3>
                <p className="text-zinc-400 leading-6">
                  Pay only for what you use with transparent pricing and no hidden fees. Scale from bytes to petabytes.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Global Network</h3>
                <p className="text-zinc-400 leading-6">
                  Access your data from anywhere in the world through our distributed network of storage nodes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
                Join thousands of developers and businesses using ThirdStorage for secure, decentralized file storage.
              </p>
              <div className="mt-8 flex items-center justify-center gap-x-6">
                <button
                  onClick={handleLogin}
                  className="px-8 py-4 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-semibold text-lg"
                >
                  Start Free Trial
                </button>
                <a
                  href="https://docs.thirdstorage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-zinc-800/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/50 rounded-md hover:bg-zinc-700/80 hover:text-white transition-colors font-semibold text-lg"
                >
                  View Documentation
                </a>
              </div>
              
              {/* Authentication options */}
              <div className="mt-12 pt-8 border-t border-zinc-800">
                <p className="text-sm text-zinc-500 mb-6">Connect with your preferred authentication method</p>
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span className="text-sm">Email</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm">Social</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm">Wallet</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 12H9v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4c0-7.2 5.3-13.2 12.5-12.5A6 6 0 0115 7z" />
                    </svg>
                    <span className="text-sm">Passkey</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <Image src="/white.svg" alt="ThirdStorage" width={16} height={16} className="filter invert" />
                </div>
                <span className="text-zinc-400 text-sm">© 2024 ThirdStorage. Built on Codex.</span>
              </div>
              <div className="flex items-center space-x-6">
                <a
                  href="https://docs.thirdstorage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Documentation
                </a>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-zinc-400 text-sm">All systems operational</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
