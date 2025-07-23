import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SEO from '../../components/SEO';

export default function RateLimitedPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SEO 
        title="Rate Limit Exceeded"
        description="You've exceeded the rate limit for gateway access. Learn about our limits and how to increase them."
        keywords="rate limit, gateway access, request limits"
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

      {/* Rate Limited Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-lg w-full text-center">
          {/* Rate Limit Icon */}
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 12a7 7 0 1114 0A7 7 0 015 12z" />
            </svg>
          </div>

          {/* Rate Limit Details */}
          <h1 className="text-2xl font-bold text-white mb-3">
            Rate Limit Exceeded
          </h1>
          
          <p className="text-zinc-400 mb-6">
            You&apos;ve made too many requests to our gateway. Please wait a moment before trying again.
          </p>

          {/* Info Cards */}
          <div className="space-y-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-white mb-2">Why are there limits?</h3>
              <p className="text-xs text-zinc-400">
                Rate limits protect our gateway from abuse and ensure fair access for everyone. This helps maintain service quality and prevents overload.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-white mb-2">Normal Limits</h3>
              <ul className="text-xs text-zinc-400 space-y-1">
                <li>• 60 requests per minute per IP address</li>
                <li>• 20 requests per 10 seconds (burst protection)</li>
                <li>• Limits reset automatically after the time window</li>
              </ul>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-white mb-2">Enhanced Protection</h3>
              <p className="text-xs text-zinc-400">
                Suspicious activity patterns (like automated scripts) receive stricter limits of 10 requests per minute to prevent abuse.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium"
            >
              Try Again
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

          {/* Help Section */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">Need Higher Limits?</h3>
            <p className="text-xs text-zinc-400 mb-3">
              If you&apos;re building an application that needs higher rate limits, consider upgrading to our Pro plan or contact us for enterprise solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link 
                href="/dashboard"
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium text-center transition-colors"
              >
                View Plans
              </Link>
              <a 
                href="https://docs.thirdstorage.cloud" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-md text-xs font-medium text-center transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Technical Info */}
          <div className="mt-6 text-xs text-zinc-500">
            <p>Rate limits are applied per IP address and reset automatically.</p>
            <p className="mt-1">
              For API access, check the response headers: <code className="text-zinc-400">X-RateLimit-*</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 