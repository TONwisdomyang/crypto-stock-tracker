'use client';

import { useState, useEffect } from 'react';
import { networkService } from '../utils/networkService';

interface NetworkMonitorProps {
  enabled?: boolean;
}

export default function NetworkMonitor({ enabled = process.env.NODE_ENV === 'development' }: NetworkMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [cacheStats, setCacheStats] = useState<any>({});

  // Update stats every 2 seconds when visible
  useEffect(() => {
    if (!isVisible || !enabled) return;

    const updateStats = () => {
      setStats(networkService.getPerformanceSummary());
      setCacheStats(networkService.getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isVisible, enabled]);

  // Get connection info
  const getConnectionInfo = () => {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return { type: 'unknown', speed: 'unknown', saveData: false };
    }

    const conn = (navigator as any).connection;
    return {
      type: conn?.effectiveType || 'unknown',
      speed: conn?.downlink ? `${conn.downlink} Mbps` : 'unknown',
      saveData: conn?.saveData || false,
    };
  };

  if (!enabled) return null;

  const connectionInfo = getConnectionInfo();

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        title="Network Performance Monitor"
      >
        📡
      </button>

      {/* Monitor panel */}
      {isVisible && (
        <div className="fixed top-4 right-4 z-40 bg-slate-800 border border-slate-600 rounded-xl p-4 w-96 max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">📊 Network Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Connection Info */}
          <div className="mb-4 p-3 bg-slate-700 rounded-lg">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Connection</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Type: <span className="text-white">{connectionInfo.type}</span></div>
              <div>Speed: <span className="text-white">{connectionInfo.speed}</span></div>
              <div>Data Saver: <span className={connectionInfo.saveData ? 'text-yellow-400' : 'text-green-400'}>
                {connectionInfo.saveData ? 'ON' : 'OFF'}
              </span></div>
            </div>
          </div>

          {/* Cache Stats */}
          <div className="mb-4 p-3 bg-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-300">Cache Status</h4>
              <button
                onClick={() => networkService.clearCache()}
                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
              >
                Clear
              </button>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Entries: <span className="text-white">{cacheStats.size}/{cacheStats.maxSize}</span></div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${(cacheStats.size / cacheStats.maxSize) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">API Performance</h4>
            
            {Object.keys(stats).length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">
                No network requests yet
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(stats).map(([url, data]: [string, any]) => (
                  <div key={url} className="p-2 bg-slate-700 rounded text-xs">
                    <div className="text-slate-300 font-medium truncate mb-1" title={url}>
                      {url.split('/').pop()}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <div>
                        <span className="block">Requests: <span className="text-white">{data.totalRequests}</span></span>
                        <span className="block">Cache Hit: <span className={data.cacheHitRate > 50 ? 'text-green-400' : 'text-yellow-400'}>
                          {data.cacheHitRate.toFixed(1)}%
                        </span></span>
                      </div>
                      <div>
                        <span className="block">Avg Time: <span className="text-white">{data.avgResponseTime.toFixed(0)}ms</span></span>
                        <span className="block">Retries: <span className={data.avgRetries > 0 ? 'text-yellow-400' : 'text-green-400'}>
                          {data.avgRetries.toFixed(1)}
                        </span></span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="text-slate-500 text-xs">Response Time</div>
                      <div className="w-full bg-slate-600 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full transition-all duration-200 ${
                            data.avgResponseTime < 500 ? 'bg-green-500' :
                            data.avgResponseTime < 2000 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((data.avgResponseTime / 3000) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {data.minResponseTime.toFixed(0)}ms - {data.maxResponseTime.toFixed(0)}ms
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mt-2">
                      Last: {new Date(data.lastRequest).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-slate-600">
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-green-500 rounded"></div>
                <span>Fast (&lt;500ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-yellow-500 rounded"></div>
                <span>Moderate (500ms-2s)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-red-500 rounded"></div>
                <span>Slow (&gt;2s)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}