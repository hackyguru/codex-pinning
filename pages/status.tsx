import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

interface SystemCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  responseTime: number | null;
  lastChecked: Date | null;
  error?: string;
}

interface SystemStatus {
  supabase: SystemCheck;
  codex: SystemCheck;
  gateway: SystemCheck;
  api: SystemCheck;
}

export default function StatusPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    supabase: {
      name: 'Database (Supabase)',
      status: 'checking',
      responseTime: null,
      lastChecked: null
    },
    codex: {
      name: 'Storage Network (Codex)',
      status: 'checking',
      responseTime: null,
      lastChecked: null
    },
    gateway: {
      name: 'Gateway API',
      status: 'checking',
      responseTime: null,
      lastChecked: null
    },
    api: {
      name: 'Core API',
      status: 'checking',
      responseTime: null,
      lastChecked: null
    }
  });

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Health check functions
  const checkSupabaseHealth = useCallback(async (): Promise<{ status: 'healthy' | 'unhealthy', responseTime: number, error?: string }> => {
    const startTime = Date.now();
    try {
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: `Database query failed: ${error.message}` 
        };
      }
      
      return { status: 'healthy', responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }, []);

  const checkCodexHealth = useCallback(async (): Promise<{ status: 'healthy' | 'unhealthy', responseTime: number, error?: string }> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // In production, this would check actual Codex node
      // For now, we'll simulate a Codex network check
      const response = await fetch('/api/hello', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { status: 'healthy', responseTime };
      } else {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: error instanceof Error ? error.message : 'Network timeout' 
      };
    }
  }, []);

  const checkGatewayHealth = useCallback(async (): Promise<{ status: 'healthy' | 'unhealthy', responseTime: number, error?: string }> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/gateway/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { status: 'healthy', responseTime };
      } else {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: `Gateway responded with ${response.status}` 
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: error instanceof Error ? error.message : 'Gateway unreachable' 
      };
    }
  }, []);

  const checkAPIHealth = useCallback(async (): Promise<{ status: 'healthy' | 'unhealthy', responseTime: number, error?: string }> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/hello', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { status: 'healthy', responseTime };
      } else {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: `API responded with ${response.status}` 
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: error instanceof Error ? error.message : 'API unreachable' 
      };
    }
  }, []);

  const runAllHealthChecks = useCallback(async () => {
    setIsRefreshing(true);
    const now = new Date();

    // Run all checks in parallel
    const [supabaseResult, codexResult, gatewayResult, apiResult] = await Promise.all([
      checkSupabaseHealth(),
      checkCodexHealth(),
      checkGatewayHealth(),
      checkAPIHealth()
    ]);

    setSystemStatus({
      supabase: {
        name: 'Database (Supabase)',
        status: supabaseResult.status,
        responseTime: supabaseResult.responseTime,
        lastChecked: now,
        error: supabaseResult.error
      },
      codex: {
        name: 'Storage Network (Codex)',
        status: codexResult.status,
        responseTime: codexResult.responseTime,
        lastChecked: now,
        error: codexResult.error
      },
      gateway: {
        name: 'Gateway API',
        status: gatewayResult.status,
        responseTime: gatewayResult.responseTime,
        lastChecked: now,
        error: gatewayResult.error
      },
      api: {
        name: 'Core API',
        status: apiResult.status,
        responseTime: apiResult.responseTime,
        lastChecked: now,
        error: apiResult.error
      }
    });

    setLastRefresh(now);
    setIsRefreshing(false);
  }, [checkSupabaseHealth, checkCodexHealth, checkGatewayHealth, checkAPIHealth]);

  useEffect(() => {
    setIsClient(true);
    runAllHealthChecks();
  }, [runAllHealthChecks]);

  // Helper function to format time consistently
  const formatTime = (date: Date): string => {
    if (!isClient) return '';
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getStatusColor = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'unhealthy': return 'text-red-400';
      case 'checking': return 'text-yellow-400';
    }
  };

  const getStatusDot = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy': return 'bg-green-400';
      case 'unhealthy': return 'bg-red-400';
      case 'checking': return 'bg-yellow-400';
    }
  };

  const getStatusText = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy': return 'Operational';
      case 'unhealthy': return 'Issues Detected';
      case 'checking': return 'Checking...';
    }
  };

  const allSystemsHealthy = Object.values(systemStatus).every(system => system.status === 'healthy');
  const anySystemsDown = Object.values(systemStatus).some(system => system.status === 'unhealthy');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                <Image src="/white.svg" alt="ThirdStorage" width={16} height={16} className="filter invert sm:w-[20px] sm:h-[20px]" />
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-white font-semibold text-sm sm:text-base">ThirdStorage</span>
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-400 text-sm sm:text-base">Status</span>
              </div>
            </div>
            <Link
              href="/"
              className="text-zinc-400 hover:text-white transition-colors text-xs sm:text-sm font-medium"
            >
              <span className="hidden sm:inline">← Back to Home</span>
              <span className="sm:hidden">← Home</span>
            </Link>
          </div>
        </div>
      </header>

            {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Overall Status */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse ${
              allSystemsHealthy ? 'bg-green-400' : anySystemsDown ? 'bg-red-400' : 'bg-yellow-400'
            }`}></div>
            <h1 className="text-xl sm:text-3xl font-bold text-white">
              {allSystemsHealthy ? 'All Systems Operational' : 
               anySystemsDown ? 'Some Systems Experiencing Issues' : 
               'Checking System Status'}
            </h1>
          </div>
          <p className="text-zinc-400 mb-4 sm:mb-6 text-sm sm:text-base px-4">
            Real-time status of ThirdStorage services and infrastructure
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-zinc-500">
            <span>Last updated: {isClient ? formatTime(lastRefresh) : '--:--:--'}</span>
            <button
              onClick={runAllHealthChecks}
              disabled={isRefreshing}
              className="px-3 py-1.5 sm:py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(systemStatus).map(([key, system]) => (
            <div
              key={key}
              className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-0">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse ${getStatusDot(system.status)}`}></div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">{system.name}</h3>
                  <span className={`text-xs sm:text-sm font-medium ${getStatusColor(system.status)}`}>
                    {getStatusText(system.status)}
                  </span>
                </div>
                {system.responseTime !== null && (
                  <span className="text-xs sm:text-sm text-zinc-400 ml-5 sm:ml-0">
                    {system.responseTime}ms
                  </span>
                )}
              </div>

              {system.error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-md p-3 mb-4">
                  <p className="text-red-300 text-sm">{system.error}</p>
                </div>
              )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-zinc-500">Status:</span>
                  <span className={`ml-2 ${getStatusColor(system.status)}`}>
                    {getStatusText(system.status)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Response Time:</span>
                  <span className="ml-2 text-zinc-300">
                    {system.responseTime !== null ? `${system.responseTime}ms` : '-'}
                  </span>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <span className="text-zinc-500">Last Checked:</span>
                  <span className="ml-2 text-zinc-300">
                    {system.lastChecked && isClient ? formatTime(system.lastChecked) : '-'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>


        {/* Footer */}
        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-xs sm:text-sm text-zinc-500 mb-3 sm:mb-4 px-4">
            Have questions about our service status? Contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6">
            <a
              href="https://docs.thirdstorage.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors text-xs sm:text-sm font-medium"
            >
              Documentation
            </a>
            <a
              href="mailto:support@thirdstorage.com"
              className="text-zinc-400 hover:text-white transition-colors text-xs sm:text-sm font-medium"
            >
              Support
            </a>
          </div>
        </div>
      </main>
    </div>
  );
} 