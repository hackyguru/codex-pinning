import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [activeTab, setActiveTab] = useState('overview');

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
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-zinc-300 text-sm font-medium">Powered by Codex Network</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl mb-6">
              <span className="block">Decentralized Storage</span>
              <span className="block text-zinc-400 mt-2">
                Built for the Future
              </span>
            </h1>

            <div className="flex items-center justify-center space-x-8 my-10">
              <p className="text-lg text-zinc-300 max-w-lg text-right">
                Store, secure and scale your data
              </p>
              <div className="w-10 h-10 rounded-full border border-zinc-500 flex items-center justify-center bg-white">
                <Image src="/black.svg" alt="ThirdStorage" width={20} height={20} className="stroke-zinc-500" />
              </div>
              <p className="text-lg text-zinc-300 max-w-lg text-left">
                Zero downtime, maximum privacy
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
                              <span className="text-zinc-400">API Requests</span>
                              <span className="text-white">1,247 / Unlimited</span>
                            </div>
                            <div className="w-full bg-zinc-800/50 rounded-full h-2">
                              <div className="h-2 bg-green-400 rounded-full" style={{ width: '15%' }}></div>
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

        {/* Feature Grid */}
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

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-all duration-300 hover:bg-zinc-900/70">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Open Source</h3>
                <p className="text-zinc-400 leading-relaxed">
                  A pinning service built by the community, for the community
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-all duration-300 hover:bg-zinc-900/70">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Orchestrated by AI</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Replication and redundancy orchestrated by AI agents for autonomous data governance.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-all duration-300 hover:bg-zinc-900/70">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Powered by Codex</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Simplifying the Codex experience by making file pinning seamless
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-all duration-300 hover:bg-zinc-900/70">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Developer First</h3>
                <p className="text-zinc-400 leading-relaxed">
                  RESTful API, multiple SDKs & intuitive docs. 
                  Integrate in minutes, not days
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-all duration-300 hover:bg-zinc-900/70">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Caters Your Dreams</h3>
                <p className="text-zinc-400 leading-relaxed">
                  From AI to gaming - from Kilobytes to Terabytes, we've got you covered
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 hover:border-zinc-700/80 transition-all duration-300 hover:bg-zinc-900/70">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Transparent Pricing</h3>
                <p className="text-zinc-400 leading-relaxed">
                 Simple, transparent pricing with a flexible enterprise model

                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="py-32">
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
              {/* Free Plan */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                  <div className="text-4xl font-bold text-white mb-4">
                    $0<span className="text-lg text-zinc-400">/month</span>
                  </div>
                  <p className="text-zinc-400 mb-8">Perfect for getting started</p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-zinc-300">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      10 MB storage
                    </li>
                    <li className="flex items-center text-zinc-300">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      1K requests/month
                    </li>
                    <li className="flex items-center text-zinc-300">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Community support
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-700/80 rounded-lg p-8 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-bold">Most Popular</span>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                  <div className="text-4xl font-bold text-white mb-4">
                    $10<span className="text-lg text-zinc-400">/month</span>
                  </div>
                  <p className="text-zinc-300 mb-8">For serious projects</p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      50 MB storage
                    </li>
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited requests
                    </li>
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Priority support
                    </li>
                  </ul>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8 relative">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                  <div className="text-4xl font-bold text-white mb-4">
                    Custom<span className="text-lg text-zinc-400">/month</span>
                  </div>
                  <p className="text-zinc-300 mb-8">For large organizations</p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited storage
                    </li>
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Advanced analytics
                    </li>
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Custom SLA
                    </li>
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Dedicated support
                    </li>
                    <li className="flex items-center text-zinc-200">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      On-premise options
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Sales Section */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-12 text-center">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4">
                  Need a Custom Solution?
                </h3>
                <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
                  Get in touch with our sales team to discuss enterprise features, volume pricing, 
                  custom integrations, and dedicated infrastructure options.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                  <a
                    href="mailto:sales@thirdstorage.com"
                    className="px-8 py-4 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-semibold text-lg"
                  >
                    Contact Sales
                  </a>
                  <a
                    href="https://calendly.com/thirdstorage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 hover:text-white transition-colors font-semibold text-lg"
                  >
                    Schedule Demo
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white mb-2">Team Training</h4>
                    <p className="text-sm text-zinc-400">Comprehensive onboarding and training for your development team</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white mb-2">Compliance Ready</h4>
                    <p className="text-sm text-zinc-400">SOC 2, GDPR, HIPAA, and other compliance certifications available</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white mb-2">99.99% SLA</h4>
                    <p className="text-sm text-zinc-400">Enterprise-grade uptime guarantees with dedicated infrastructure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-32 bg-zinc-900/30">
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
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
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
