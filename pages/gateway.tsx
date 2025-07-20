import { useState } from 'react';
import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';

export default function Gateway() {
  const router = useRouter();
  const { authenticated, logout } = usePrivy();
  const [cid, setCid] = useState('');
  const [testResult, setTestResult] = useState<{
    status: number;
    success: boolean;
    message: string;
    contentType?: string;
    contentLength?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestGateway = async () => {
    if (!cid.trim()) {
      setTestResult({
        status: 400,
        success: false,
        message: 'Please enter a CID to test'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Test the public gateway - no authentication needed
      const response = await fetch(`/api/gateway/${cid.trim()}`);
      
      const contentType = response.headers.get('content-type') || 'unknown';
      const contentLength = response.headers.get('content-length') || 'unknown';

      if (response.ok) {
        setTestResult({
          status: response.status,
          success: true,
          message: 'Content successfully retrieved from Codex network',
          contentType,
          contentLength
        });
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || 'Unknown error';
        }

        setTestResult({
          status: response.status,
          success: false,
          message: errorMessage,
          contentType,
          contentLength
        });
      }
    } catch (error) {
      setTestResult({
        status: 0,
        success: false,
        message: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTestGateway();
    }
  };

  const getGatewayUrl = () => {
    if (typeof window !== 'undefined' && cid.trim()) {
      return `${window.location.origin}/api/gateway/${cid.trim()}`;
    }
    return '';
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header - matching dashboard style */}
      <header className="">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Left section - Logo and Project Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image src="/white.svg" alt="ThirdStorage" width={20} height={20} className="filter invert" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-400">gateway</span>
                <span className="px-2 py-1 text-xs bg-zinc-800/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/50 rounded-md">
                  public
                </span>
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center">
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-md font-medium">
                  Testnet
                </span>
              </div>
            <div className="flex items-center space-x-2">
              <a
                href='https://docs.thirdstorage.com'
                target='_blank'
                className="px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
              >
                Docs
              </a>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-2 text-sm bg-white text-black hover:bg-zinc-100 rounded-md transition-colors"
              >
                Dashboard
              </button>
            </div>

            {/* User Menu */}
            {authenticated && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleLogout}
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="border-b border-zinc-800">
        <div className="px-4 sm:px-6">
          <div className="py-4">
            <div className="relative">
              <h1 className="text-white text-lg font-semibold">Public Gateway</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Info Section */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-3">Public Gateway Access</h3>
                <p className="text-zinc-400 mb-4">This gateway provides public access to Codex content with no authentication required.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                    <span className="text-sm text-zinc-300">No authentication required</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                    <span className="text-sm text-zinc-300">URLs are shareable with anyone</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                    <span className="text-sm text-zinc-300">Works from any browser or application</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                    <span className="text-sm text-zinc-300">CORS enabled for web app integration</span>
                  </div>
                </div>
              </div>
            </div>
                <div className="text-sm text-orange-400 border border-orange-500/30 mt-4  rounded-lg p-4">The public read-only gateway operates without any revenue as a public goods offering. Please expect slower response times and downtimes as the service is not incentivized. Subscribe for an Enterprise plan for a dedicated private gateway.</div>
          </div>

          {/* Test Form */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Test Gateway Access</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="cid" className="block text-sm font-medium text-zinc-300 mb-3">
                  Codex CID
                </label>
                <input
                  type="text"
                  id="cid"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N"
                  className="block text-sm w-full px-4 py-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600"
                />
              </div>

              {cid.trim() && (
                <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-2">Gateway URL:</p>
                  <code className="text-sm text-zinc-300 break-all bg-zinc-800/50 px-2 py-1 rounded">{getGatewayUrl()}</code>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleTestGateway}
                  disabled={isLoading || !cid.trim()}
                  className="inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-100"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-600 border-t-black mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Access Content'
                  )}
                </button>

                {cid.trim() && testResult?.success && (
                  <a
                    href={getGatewayUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-300 hover:text-white rounded-lg font-medium transition-all duration-300"
                  >
                    Open Content
                    <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Results</h2>
              
              <div className={`backdrop-blur-sm rounded-lg p-4 border ${
                testResult.success 
                  ? 'bg-zinc-800/50 border-zinc-700/50' 
                  : 'bg-zinc-900/50 border-zinc-800/50'
              }`}>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    {testResult.success ? (
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${
                      testResult.success ? 'text-white' : 'text-zinc-300'
                    }`}>
                      Status: {testResult.status} - {testResult.success ? 'Success' : 'Error'}
                    </h3>
                    <p className={`mt-2 ${
                      testResult.success ? 'text-zinc-300' : 'text-zinc-400'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.contentType && (
                      <div className="mt-3 text-sm text-zinc-400">
                        <p><strong className="text-zinc-300">Content Type:</strong> {testResult.contentType}</p>
                        {testResult.contentLength && (
                          <p><strong className="text-zinc-300">Content Length:</strong> {testResult.contentLength} bytes</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 