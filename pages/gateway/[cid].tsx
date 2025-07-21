import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import SEO from '../../components/SEO';

interface GatewayError {
  error: string;
  status: number;
}

export default function GatewayPage() {
  const router = useRouter();
  const { cid } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<GatewayError | null>(null);
  const [contentInfo, setContentInfo] = useState<{
    contentType: string;
    contentLength?: string;
    filename?: string;
  } | null>(null);

  useEffect(() => {
    if (!cid || typeof cid !== 'string') return;

    const checkContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Make a HEAD request first to check if content exists and get metadata
        const response = await fetch(`/api/gateway/${cid}`, {
          method: 'HEAD',
        });

        if (!response.ok) {
          // Try to get error details
          const errorResponse = await fetch(`/api/gateway/${cid}`);
          const errorData = await errorResponse.json();
          
          setError({
            error: errorData.error || 'Unknown error',
            status: response.status
          });
          return;
        }

        // Get content metadata
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');
        const contentDisposition = response.headers.get('content-disposition');
        
        // Extract filename from content-disposition header
        let filename: string | undefined;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="([^"]+)"/);
          if (match) {
            filename = match[1];
          }
        }

        setContentInfo({
          contentType,
          contentLength: contentLength || undefined,
          filename
        });

        // If it's a viewable content type, redirect to the API endpoint
        if (contentType.startsWith('image/') || 
            contentType.startsWith('video/') || 
            contentType.startsWith('audio/') ||
            contentType === 'application/pdf' ||
            contentType.startsWith('text/')) {
          // Redirect to the API endpoint for direct viewing
          window.location.href = `/api/gateway/${cid}`;
        }

      } catch (err) {
        setError({
          error: 'Network error occurred',
          status: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkContent();
  }, [cid]);

  const getErrorTitle = (status: number) => {
    switch (status) {
      case 400:
        return 'Invalid CID';
      case 404:
        return 'Content Not Found';
      case 500:
        return 'Server Error';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = (error: string, status: number) => {
    switch (status) {
      case 400:
        return 'The Content Identifier (CID) you provided is not valid. Please check the CID format and try again.';
      case 404:
        return 'The content you\'re looking for could not be found on the Codex network. It may have been removed or the CID might be incorrect.';
      case 500:
        return 'There was an internal server error while trying to retrieve the content. Please try again later.';
      default:
        return error || 'An unexpected error occurred while trying to access the content.';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SEO 
          title={`Content Access Error - ${getErrorTitle(error.status)}`}
          description={getErrorDescription(error.error, error.status)}
          keywords="content access, CID error, decentralized storage error"
          noindex={true}
        />
        {/* Header */}
        <header className="border-b border-zinc-800">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image src="/white.svg" alt="ThirdStorage" width={20} height={20} className="filter invert" />
                </div>
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-400">gateway</span>
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-md font-medium">
                  Public
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Error Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Error Details */}
            <h1 className="text-2xl font-bold text-white mb-3">
              {getErrorTitle(error.status)}
            </h1>
            
            <p className="text-zinc-400 mb-6">
              {getErrorDescription(error.error, error.status)}
            </p>

            {/* CID Display */}
            {cid && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
                <p className="text-xs text-zinc-500 mb-2">Requested CID:</p>
                <p className="font-mono text-sm text-zinc-300 break-all">{cid}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full px-4 py-3 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium"
              >
                Go Back
              </button>
              
              <Link 
                href="/dashboard"
                className="block w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-md transition-colors font-medium"
              >
                Go to Dashboard
              </Link>

              <Link 
                href="/"
                className="block w-full px-4 py-3 text-zinc-400 hover:text-white transition-colors"
              >
                Back to Home
              </Link>
            </div>

            {/* Help Text */}
            <div className="mt-8 text-xs text-zinc-500">
              <p>Need help? Check our <a href="https://docs.thirdstorage.com" target="_blank" className="text-zinc-400 hover:text-white underline">documentation</a> for more information about CIDs and content access.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached as we redirect for valid content
  if (contentInfo) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-zinc-400">Redirecting to content...</p>
        </div>
      </div>
    );
  }

  return null;
} 