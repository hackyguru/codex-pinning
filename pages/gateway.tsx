import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Gateway() {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black relative">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-20 w-80 h-80 bg-white/2 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-white/4 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center">
                <Image src="/logo.svg" alt="ThirdStorage" width={24} height={24} className="filter invert" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Public Codex Gateway</h1>
                <p className="text-white/60 text-sm">Access any Codex content - no login required</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="backdrop-blur-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Section */}
        <div className="backdrop-blur-xl bg-green-500/10 border border-green-400/30 rounded-2xl shadow-2xl p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-green-300">Public Gateway</h3>
              <div className="mt-3 text-green-200/80">
                <p className="mb-3">This gateway provides public access to Codex content:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm">No authentication required</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm">URLs are shareable with anyone</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm">Works from any browser or application</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm">CORS enabled for web app integration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Form */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Test Gateway Access</h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="cid" className="block text-sm font-medium text-white/80 mb-3">
                Codex CID
              </label>
              <input
                type="text"
                id="cid"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N"
                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-lg"
              />
            </div>

            {cid.trim() && (
              <div className="backdrop-blur-lg bg-white/5 border border-white/20 rounded-xl p-4">
                <p className="text-sm text-white/80 mb-2">Gateway URL:</p>
                <code className="text-sm text-blue-300 break-all">{getGatewayUrl()}</code>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleTestGateway}
                disabled={isLoading || !cid.trim()}
                className="inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 hover:scale-105 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black mr-2"></div>
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
                  className="inline-flex items-center px-6 py-3 backdrop-blur-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
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
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Results</h2>
            
            <div className={`backdrop-blur-lg rounded-xl p-4 border ${
              testResult.success 
                ? 'bg-green-500/10 border-green-400/30' 
                : 'bg-red-500/10 border-red-400/30'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {testResult.success ? (
                    <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-4">
                  <h3 className={`text-lg font-semibold ${
                    testResult.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    Status: {testResult.status} - {testResult.success ? 'Success' : 'Error'}
                  </h3>
                  <p className={`mt-2 ${
                    testResult.success ? 'text-green-200/80' : 'text-red-200/80'
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.contentType && (
                    <div className="mt-3 text-sm text-white/70">
                      <p><strong>Content Type:</strong> {testResult.contentType}</p>
                      {testResult.contentLength && (
                        <p><strong>Content Length:</strong> {testResult.contentLength} bytes</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Example CIDs */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Example CIDs</h2>
          <div className="backdrop-blur-lg bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
            <p className="text-yellow-200/80 mb-4">
              <strong>Note:</strong> These are example CID formats. Replace with actual CIDs from your Codex node.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between backdrop-blur-lg bg-white/5 border border-white/20 rounded-lg p-3">
                <code className="text-sm text-white/80 font-mono">QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N</code>
                <button
                  onClick={() => setCid('QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N')}
                  className="backdrop-blur-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                >
                  Use This
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 