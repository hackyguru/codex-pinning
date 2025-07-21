import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAvailablePlans } from '../lib/plans';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState({
    supabase: false,
    codex: false,
    checking: true
  });

  // Health check functions
  const checkSupabaseHealth = async (): Promise<boolean> => {
    try {
      // Try to read from a simple table or run a basic query
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  };

  const checkCodexHealth = async (): Promise<boolean> => {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Check if Codex node is active by checking the gateway
      const response = await fetch('/api/gateway/health', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      try {
        // Fallback: check if we can access any gateway functionality
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Try to check if we can access a basic Codex endpoint
        // This is a placeholder - you would replace with actual Codex network endpoint
        const response = await fetch('/api/hello', {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        // If our basic API works, assume Codex connectivity is okay
        // In production, you'd want to check actual Codex node connectivity
        return response.ok;
      } catch (fallbackError) {
        console.error('Codex health check failed:', error, fallbackError);
        return false;
      }
    }
  };

  // Run health checks on component mount
  useEffect(() => {
    const runHealthChecks = async () => {
      const [supabaseStatus, codexStatus] = await Promise.all([
        checkSupabaseHealth(),
        checkCodexHealth()
      ]);

      setSystemStatus({
        supabase: supabaseStatus,
        codex: codexStatus,
        checking: false
      });
    };

    runHealthChecks();
  }, []);

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
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <Image src="/white.svg" alt="ThirdStorage" width={30} height={30} className="filter invert" />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="https://docs.thirdstorage.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
              >
                Documentation
              </a>
              <button
                onClick={handleLogin}
                className="px-6 py-2.5 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-semibold text-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-24 pb-20 text-center lg:pt-40">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-zinc-300 text-sm font-medium">Alpha - Live on Codex Testnet</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl mb-6">
              <span className="block">Decentralized Storage</span>
              <span className="block text-zinc-400 mt-2">
                Made Simple
              </span>
            </h1>

            <div className="flex items-center justify-center space-x-8 my-10">
              <p className="text-lg text-zinc-300 max-w-lg text-right">
              Built for Censorship Resistance
              </p>
              <div className="w-10 h-10 rounded-full border border-zinc-500 flex items-center justify-center bg-white">
                <Image src="/black.svg" alt="ThirdStorage" width={20} height={20} className="stroke-zinc-500" />
              </div>
              <p className="text-lg text-zinc-300 max-w-lg text-left">
              AI Orchestrated Pinning
              </p>
            </div>



            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={handleLogin}
                className="px-8 py-4 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-semibold text-lg"
              >
                Start Building Today
              </button>
              <a
                href="https://docs.thirdstorage.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-md text-black group flex bg-zinc-500 items-center space-x-2  transition-colors font-semibold text-lg"
              >
                <span>Explore Documentation</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
          
        {/* Dashboard Demo Preview */}
        <div className="py-10 bg-zinc-950/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Demo Dashboard Container */}
            <div className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden">
              {/* Demo Header */}
              <div className="border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center justify-between h-16 px-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <Image src="/white.svg" alt="ThirdStorage" width={20} height={20} className="filter invert" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-zinc-400">/</span>
                        <span className="text-zinc-400">demo</span>
                                                 <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">
                           pro
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-md font-medium">
                      Demo Preview
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search a CID"
                        disabled
                        className="block w-64 pl-10 pr-16 py-2 border border-zinc-700 rounded-md bg-zinc-900 text-zinc-300 placeholder-zinc-500 text-sm opacity-60"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Navigation */}
              <nav className="border-b border-zinc-800/50 bg-zinc-900/30">
                <div className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'storage', label: 'Storage' },
                    { id: 'gateway', label: 'Gateway' },
                    { id: 'secrets', label: 'Pinning Secrets' },
                    { id: 'payments', label: 'Payments' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`relative py-4 text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? 'text-white'
                          : 'text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      {item.label}
                      {activeTab === item.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                      )}
                    </button>
                  ))}
                </div>
              </nav>

                             {/* Demo Content */}
               <div className="p-6 h-[600px] overflow-y-auto">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Demo Stats Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Storage Usage */}
                      <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
                            <p className="text-zinc-400 text-sm">Track your storage consumption</p>
                          </div>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-zinc-800/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/50">
                            PRO
                          </span>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">24.5 MB used</span>
                            <span className="text-zinc-400">50 MB total</span>
                          </div>
                          <div className="w-full bg-zinc-800/50 rounded-full h-3">
                            <div className="h-3 bg-white/50 rounded-full transition-all duration-500" style={{ width: '49%' }}></div>
                          </div>
                          <div className="flex justify-between text-sm text-zinc-400">
                            <span>12 files</span>
                            <span>49.0% used</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="flex flex-col space-y-4">
                        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex-1">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-400 mb-1">Total Files</p>
                              <p className="text-2xl font-semibold text-white">12</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex-1">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 12H9v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4c0-7.2 5.3-13.2 12.5-12.5A6 6 0 0115 7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-400 mb-1">API Keys</p>
                              <p className="text-2xl font-semibold text-white">3</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Files Demo */}
                    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Recent Files</h2>
                        <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                          View all →
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { name: 'project-logo.png', size: '2.4 MB', type: 'image', cid: 'QmX7Y8Z...9A0B' },
                          { name: 'documentation.pdf', size: '1.8 MB', type: 'document', cid: 'QmA1B2C...3D4E' },
                          { name: 'backup-data.json', size: '856 KB', type: 'code', cid: 'QmF5G6H...7I8J' },
                          { name: 'video-demo.mp4', size: '12.3 MB', type: 'video', cid: 'QmK9L0M...1N2O' },
                          { name: 'config.yaml', size: '4.2 KB', type: 'code', cid: 'QmP3Q4R...5S6T' },
                          { name: 'presentation.pptx', size: '5.7 MB', type: 'document', cid: 'QmU7V8W...9X0Y' }
                        ].map((file, index) => (
                          <div key={index} className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg p-4 hover:border-zinc-600/50 transition-all duration-300">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center">
                                {file.type === 'image' && '🖼️'}
                                {file.type === 'document' && '📄'}
                                {file.type === 'code' && '💾'}
                                {file.type === 'video' && '🎥'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{file.name}</p>
                                <p className="text-zinc-400 text-xs">{file.size}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                                Pinned
                              </span>
                              <code className="text-xs text-zinc-500 font-mono">{file.cid}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'storage' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-white">Storage Management</h1>
                        <p className="text-zinc-400">Upload, organize, and manage your files</p>
                      </div>
                      <button className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm">
                        Upload Files
                      </button>
                    </div>

                                         {/* Upload Area */}
                     <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center bg-zinc-900/30 mb-6">
                       <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                         <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                         </svg>
                       </div>
                       <h3 className="text-lg font-medium text-white mb-2">Drop files to upload</h3>
                       <p className="text-zinc-400 mb-4">or click to browse your computer</p>
                       <p className="text-xs text-zinc-500">Support for images, documents, videos, and more</p>
                     </div>

                     {/* Storage Stats */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                         <h3 className="text-lg font-semibold text-white mb-2">Storage Used</h3>
                         <p className="text-2xl font-bold text-white">24.5 MB</p>
                         <p className="text-sm text-zinc-400">of 50 MB total</p>
                       </div>
                       <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                         <h3 className="text-lg font-semibold text-white mb-2">Files Stored</h3>
                         <p className="text-2xl font-bold text-white">12</p>
                         <p className="text-sm text-zinc-400">across all types</p>
                       </div>
                       <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                         <h3 className="text-lg font-semibold text-white mb-2">Upload Speed</h3>
                         <p className="text-2xl font-bold text-white">2.3 MB/s</p>
                         <p className="text-sm text-zinc-400">average this month</p>
                       </div>
                     </div>
                  </div>
                )}

                {activeTab === 'gateway' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Gateway Access</h1>
                      <p className="text-zinc-400">Test and access your files through our high-performance gateway</p>
                    </div>

                                         <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 mb-6">
                       <h2 className="text-xl font-semibold text-white mb-6">Test Gateway Access</h2>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-sm font-medium text-zinc-300 mb-2">
                             Content ID (CID)
                           </label>
                           <input
                             type="text"
                             placeholder="QmYourContentHashHere..."
                             disabled
                             className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 text-sm opacity-60"
                           />
                         </div>
                         <button className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm opacity-60">
                           Test Access
                         </button>
                       </div>
                     </div>

                     {/* Gateway Performance Stats */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                         <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                         <div className="space-y-3">
                           <div className="flex justify-between">
                             <span className="text-zinc-400">Average Response Time</span>
                             <span className="text-white font-medium">127ms</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-zinc-400">Cache Hit Rate</span>
                             <span className="text-white font-medium">94.2%</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-zinc-400">Monthly Requests</span>
                             <span className="text-white font-medium">1,247</span>
                           </div>
                         </div>
                       </div>
                       <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                         <h3 className="text-lg font-semibold text-white mb-4">Gateway Endpoints</h3>
                         <div className="space-y-3">
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                             <span className="text-zinc-300 text-sm font-mono">gateway.thirdstorage.com</span>
                           </div>
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                             <span className="text-zinc-300 text-sm font-mono">cdn.thirdstorage.com</span>
                           </div>
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                             <span className="text-zinc-300 text-sm font-mono">ipfs.thirdstorage.com</span>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Recent Gateway Activity */}
                     <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                       <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                       <div className="space-y-3">
                         {[
                           { file: 'project-logo.png', requests: '24', time: '2 min ago' },
                           { file: 'documentation.pdf', requests: '7', time: '15 min ago' },
                           { file: 'backup-data.json', requests: '12', time: '1 hour ago' }
                         ].map((activity, index) => (
                           <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-b-0">
                             <div>
                               <p className="text-white text-sm font-medium">{activity.file}</p>
                               <p className="text-zinc-400 text-xs">{activity.requests} requests</p>
                             </div>
                             <span className="text-zinc-500 text-xs">{activity.time}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>
                )}

                {activeTab === 'secrets' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-white">Pinning Secrets</h1>
                        <p className="text-zinc-400">Manage API keys for programmatic access</p>
                      </div>
                      <button className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm">
                        Create Secret
                      </button>
                    </div>

                    <div className="space-y-4">
                      {[
                        { name: 'Production API', prefix: 'ps_prod_', lastUsed: '2 hours ago', status: 'active' },
                        { name: 'Development API', prefix: 'ps_dev_', lastUsed: '1 day ago', status: 'active' },
                        { name: 'Testing Key', prefix: 'ps_test_', lastUsed: '1 week ago', status: 'inactive' }
                      ].map((secret, index) => (
                        <div key={index} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-white">{secret.name}</h3>
                              <p className="text-sm text-zinc-400">Prefix: {secret.prefix}••••••••</p>
                              <p className="text-xs text-zinc-500">Last used: {secret.lastUsed}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              secret.status === 'active' 
                                ? 'bg-green-900/20 text-green-400 border border-green-500/30'
                                : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50'
                            }`}>
                              {secret.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'payments' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Billing & Payments</h1>
                      <p className="text-zinc-400">Manage your subscription and billing information</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Current Plan</h2>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-medium text-white">Pro Plan</span>
                          <span className="text-2xl font-bold text-white">$10<span className="text-sm text-zinc-400">/month</span></span>
                        </div>
                        <ul className="space-y-2 text-sm text-zinc-300">
                          <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            50 MB storage
                          </li>
                          <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Unlimited requests
                          </li>
                          <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Priority support
                          </li>
                        </ul>
                      </div>

                      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Usage This Month</h2>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-zinc-400">Storage</span>
                              <span className="text-white">24.5 MB / 50 MB</span>
                            </div>
                            <div className="w-full bg-zinc-800/50 rounded-full h-2">
                              <div className="h-2 bg-green-400 rounded-full" style={{ width: '49%' }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-zinc-400">Pay-as-you-go storage usage</span>
                              <span className="text-white">2.3 GB / $0.046</span>
                            </div>
                            <div className="w-full bg-zinc-800/50 rounded-full h-2">
                              <div className="h-2 bg-blue-400 rounded-full" style={{ width: '23%' }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500 mt-1">
                              <span>$0.02 per GB</span>
                              <span>Est. $0.046 this month</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-zinc-400">Private egress</span>
                              <span className="text-zinc-500 text-xs">Coming soon</span>
                            </div>
                            <div className="w-full bg-zinc-800/50 rounded-full h-2">
                              <div className="h-2 bg-zinc-700 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              We&apos;re working on implementing usage tracking for private egress
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Demo Footer */}
              <div className="border-t border-zinc-800/50 bg-zinc-900/30 px-6 py-4">
                <div className="flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">
                    ✨ This is a preview of your dashboard interface • 
                    <button
                      onClick={handleLogin}
                      className="text-white hover:text-zinc-300 transition-colors ml-1 underline"
                    >
                      Sign up to get started
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Bento Feature Grid */}
        <div className="py-32 bg-zinc-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
                Why Choose ThirdStorage?
              </h2>
              <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
                Built on cutting-edge decentralized technology with enterprise-grade reliability. 
                Experience the future of data storage today.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Open Source - Interactive GitHub stats */}
              <div className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/70 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                                         <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                       <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                      </svg>
                    </div>
                                         <div className="flex items-center space-x-2 transition-all duration-500">
                       <div className="flex space-x-1">
                         <div className="w-2 h-2 bg-zinc-600 group-hover:bg-green-400 rounded-full animate-pulse transition-colors duration-500"></div>
                         <div className="w-2 h-2 bg-zinc-600 group-hover:bg-green-400 rounded-full animate-pulse transition-colors duration-500" style={{animationDelay: '0.2s'}}></div>
                         <div className="w-2 h-2 bg-zinc-600 group-hover:bg-green-400 rounded-full animate-pulse transition-colors duration-500" style={{animationDelay: '0.4s'}}></div>
                       </div>
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Open Source</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    A pinning service built by the community, for the community
                  </p>
                                     <div className="flex items-center space-x-4 text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500">
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      134 stars
                    </span>
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      23 forks
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Orchestrated - Animated network */}
              <div className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/70 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                                         <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                                         <div className="flex items-center space-x-1 transition-all duration-500">
                       <div className="w-3 h-3 bg-zinc-600 group-hover:bg-blue-400 rounded-full animate-ping transition-colors duration-500"></div>
                       <div className="w-2 h-2 bg-zinc-600 group-hover:bg-blue-400 rounded-full transition-colors duration-500"></div>
                       <div className="w-1 h-1 bg-zinc-600 group-hover:bg-blue-400 rounded-full animate-pulse transition-colors duration-500"></div>
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Orchestrated by AI</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    Replication and redundancy orchestrated by AI agents for autonomous data governance
                  </p>
                                     <div className="flex justify-between text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500">
                     <span>Active Agents: 12</span>
                     <span className="text-zinc-600 group-hover:text-green-400 transition-colors duration-500">99.8% efficiency</span>
                   </div>
                </div>
              </div>

              {/* Powered by Codex - Animated logo */}
              <div className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/70 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                                         <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                                         <div className="text-xs text-zinc-600 group-hover:text-purple-400 transition-colors duration-500 font-mono">
                       v2.1.4
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Powered by Codex</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    Simplifying the Codex experience by making file pinning seamless
                  </p>
                                     <div className="w-full bg-zinc-800 rounded-full h-1 transition-opacity duration-500">
                     <div className="bg-zinc-600 group-hover:bg-purple-400 h-1 rounded-full w-3/4 transition-all duration-1000 group-hover:w-full"></div>
                   </div>
                </div>
              </div>

              {/* Developer First - Code snippet */}
              <div className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/70 overflow-hidden md:col-span-2">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                                         <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                                         <div className="flex space-x-2 transition-all duration-500">
                       <div className="w-3 h-3 bg-zinc-600 group-hover:bg-red-400 rounded-full transition-colors duration-500"></div>
                       <div className="w-3 h-3 bg-zinc-600 group-hover:bg-yellow-400 rounded-full transition-colors duration-500"></div>
                       <div className="w-3 h-3 bg-zinc-600 group-hover:bg-green-400 rounded-full transition-colors duration-500"></div>
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Developer First</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    RESTful API, multiple SDKs & intuitive docs. Integrate in minutes, not days
                  </p>
                                     <div className="bg-zinc-800/50 rounded-lg p-4 font-mono text-sm transition-all duration-500">
                     <div className="text-zinc-600 group-hover:text-emerald-400 transition-colors duration-500">curl -X POST \\</div>
                     <div className="text-zinc-600 group-hover:text-zinc-300 ml-2 transition-colors duration-500">-H &quot;Authorization: Bearer $API_KEY&quot; \\</div>
                                            <div className="text-zinc-600 group-hover:text-zinc-300 ml-2 transition-colors duration-500">-F &quot;file=@myfile.jpg&quot; \\</div>
                     <div className="text-zinc-600 group-hover:text-zinc-300 ml-2 transition-colors duration-500">https://api.thirdstorage.com/pin</div>
                   </div>
                </div>
              </div>

              {/* Caters Your Dreams - Animated chart */}
              <div className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/70 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                                         <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                                         <div className="text-xs text-zinc-600 group-hover:text-orange-400 transition-colors duration-500">
                       24.7TB stored
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Caters Your Dreams</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    From AI to gaming - from Kilobytes to Terabytes, we've got you covered
                  </p>
                                     <div className="space-y-2 transition-all duration-500">
                     <div className="flex justify-between text-xs">
                       <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500">AI Models</span>
                       <span className="text-zinc-600 group-hover:text-white transition-colors duration-500">45%</span>
                     </div>
                     <div className="w-full bg-zinc-800 rounded-full h-1">
                       <div className="bg-zinc-600 group-hover:bg-orange-400 h-1 rounded-full transition-all duration-1000 group-hover:w-[45%] w-[25%]"></div>
                     </div>
                     <div className="flex justify-between text-xs">
                       <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500">Gaming Assets</span>
                       <span className="text-zinc-600 group-hover:text-white transition-colors duration-500">35%</span>
                     </div>
                     <div className="w-full bg-zinc-800 rounded-full h-1">
                       <div className="bg-zinc-600 group-hover:bg-orange-400 h-1 rounded-full transition-all duration-1000 delay-200 group-hover:w-[35%] w-[20%]"></div>
                     </div>
                   </div>
                </div>
              </div>

              {/* Transparent Pricing - Price ticker */}
              <div className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/70 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                                         <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                                         <div className="text-xs text-zinc-600 group-hover:text-green-400 transition-colors duration-500 font-mono">
                       $0.02/GB
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Transparent Pricing</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    Simple, transparent pricing with a flexible enterprise model
                  </p>
                                     <div className="flex justify-between items-center transition-all duration-500">
                     <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500">Storage Cost</span>
                     <div className="flex items-center space-x-1">
                       <span className="text-xs text-zinc-600 group-hover:text-green-400 transition-colors duration-500">-12%</span>
                       <svg className="w-3 h-3 text-zinc-600 group-hover:text-green-400 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                       </svg>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-zinc-400">
                Start free and scale as you grow. No hidden fees, ever.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {getAvailablePlans().map((plan) => (
                <div 
                  key={plan.id}
                  className={`bg-zinc-900/50 backdrop-blur-sm border rounded-lg p-8 relative ${
                    plan.popular 
                      ? 'border-zinc-700/80' 
                      : 'border-zinc-800/50'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-bold">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-white mb-4">
                      {plan.price.formatted}
                      {plan.id !== 'enterprise' && (
                        <span className="text-lg text-zinc-400">/month</span>
                      )}
                    </div>
                    <p className={`mb-8 ${plan.popular ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {plan.description}
                    </p>
                    <ul className="space-y-4 mb-8">
                      {plan.features.filter(f => f.included).slice(0, 5).map((feature, idx) => (
                        <li key={idx} className={`flex items-center ${
                          plan.popular ? 'text-zinc-200' : 'text-zinc-300'
                        }`}>
                          <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature.limit ? `${feature.limit} ${feature.name.toLowerCase()}` : feature.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>


          </div>
        </div>

        {/* CTA Section */}
        <div className="py-10 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-16 text-center">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
                Ready to Build the Future?
              </h2>
              <p className="text-xl text-zinc-300 max-w-3xl mx-auto mb-12 leading-relaxed">
                Join thousands of developers and businesses using ThirdStorage for secure, 
                decentralized file storage. Start building today with our generous free tier.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
                <button
                  onClick={handleLogin}
                  className="px-10 py-4 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-semibold text-lg"
                >
                  Start Free Trial
                </button>
                <a
                  href="https://docs.thirdstorage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-10 py-4 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 hover:text-white transition-colors font-semibold text-lg"
                >
                  View Documentation
                </a>
              </div>
              
              {/* Authentication options */}
              <div className="pt-8 border-t border-zinc-800">
                <p className="text-sm text-zinc-500 mb-6">Connect with your preferred method</p>
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span className="text-sm">Email</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm">Social</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm">Wallet</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
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
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <Image src="/white.svg" alt="ThirdStorage" width={16} height={16} className="filter invert" />
                </div>
                <span className="text-zinc-400 text-sm">© 2024 ThirdStorage. Built on Codex.</span>
              </div>
              <div className="flex items-center space-x-8">
                <a
                  href="https://docs.thirdstorage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Documentation
                </a>
                <Link href="/status" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">Status</Link>
                <div className="flex items-center space-x-2">
                  {systemStatus.checking ? (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-zinc-400 text-sm">Checking system status...</span>
                    </>
                  ) : systemStatus.supabase && systemStatus.codex ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-zinc-400 text-sm">All systems operational</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-zinc-400 text-sm">
                        System issues detected
                        {!systemStatus.supabase && !systemStatus.codex 
                          ? " (Database & Storage)" 
                          : !systemStatus.supabase 
                          ? " (Database)" 
                          : " (Storage)"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
