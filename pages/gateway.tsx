import { useState } from 'react';
import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';

export default function Gateway() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [cid, setCid] = useState('');
  const [testResult, setTestResult] = useState<{
    status: number;
    success: boolean;
    message: string;
    contentType?: string;
    contentLength?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  if (ready && !authenticated) {
    router.push('/');
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
      const response = await fetch(`/api/gateway/${cid.trim()}`);
      const contentType = response.headers.get('content-type') || 'unknown';
      const contentLength = response.headers.get('content-length') || 'unknown';

      if (response.ok) {
        setTestResult({
          status: response.status,
          success: true,
          message: 'Content successfully retrieved from Codex',
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gateway</h1>
              <p className="text-sm text-gray-500">Access Codex Content</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Test Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Access Content</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="cid" className="block text-sm font-medium text-gray-700 mb-2">
                Codex CID
              </label>
              <input
                type="text"
                id="cid"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {cid.trim() && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">Gateway URL:</p>
                <code className="text-sm text-blue-600 break-all">{getGatewayUrl()}</code>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleTestGateway}
                disabled={isLoading || !cid.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Open Content
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Results</h2>
            
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {testResult.success ? (
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    Status: {testResult.status} - {testResult.success ? 'Success' : 'Error'}
                  </h3>
                  <p className={`mt-1 text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                  {testResult.contentType && (
                    <div className="mt-2 text-sm text-gray-600">
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
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Example CIDs</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> These are example CID formats. Replace with actual CIDs from your Codex node.
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-sm text-gray-600">QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N</code>
                <button
                  onClick={() => setCid('QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N')}
                  className="text-xs text-blue-600 hover:text-blue-800"
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