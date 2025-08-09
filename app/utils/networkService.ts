// 進階網路服務 - 支援快取、重試、去重複請求等功能

interface NetworkMetrics {
  responseTime: number;
  cacheHit: boolean;
  retryCount: number;
  payloadSize: number;
  timestamp: number;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  etag?: string;
}

interface RequestConfig {
  timeout?: number;
  retry?: number;
  ttl?: number; // cache time-to-live in milliseconds
  retryDelay?: number;
  signal?: AbortSignal;
}

class NetworkService {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<unknown>>();
  private metrics = new Map<string, NetworkMetrics[]>();
  private maxCacheSize = 50;
  private defaultTimeout = 10000; // 10 seconds
  
  constructor() {
    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), 60000); // every minute
  }

  async fetch<T = unknown>(
    url: string, 
    options: RequestConfig = {}
  ): Promise<{ data: T; metrics: NetworkMetrics }> {
    const cacheKey = this.getCacheKey(url, options);
    const startTime = performance.now();
    
    // Check cache first
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      const metrics: NetworkMetrics = {
        responseTime: performance.now() - startTime,
        cacheHit: true,
        retryCount: 0,
        payloadSize: JSON.stringify(cached.data).length,
        timestamp: Date.now()
      };
      this.recordMetrics(url, metrics);
      return { data: cached.data, metrics };
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      const data = await this.pendingRequests.get(cacheKey) as T;
      const metrics: NetworkMetrics = {
        responseTime: performance.now() - startTime,
        cacheHit: false,
        retryCount: 0,
        payloadSize: JSON.stringify(data).length,
        timestamp: Date.now()
      };
      return { data, metrics };
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(url, options, startTime);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(
    url: string, 
    options: RequestConfig,
    startTime: number
  ): Promise<{ data: T; metrics: NetworkMetrics }> {
    const {
      timeout = this.defaultTimeout,
      retry = 3,
      ttl = 300000, // 5 minutes default
      retryDelay = 1000,
      signal
    } = options;

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        // Combine external signal with timeout signal
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as T;
        const responseTime = performance.now() - startTime;
        const payloadSize = JSON.stringify(data).length;

        // Cache the successful response
        this.setCache(this.getCacheKey(url, options), data, ttl, response.headers.get('etag') || undefined);

        const metrics: NetworkMetrics = {
          responseTime,
          cacheHit: false,
          retryCount,
          payloadSize,
          timestamp: Date.now()
        };

        this.recordMetrics(url, metrics);
        return { data, metrics };

      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        // Don't retry on abort or certain errors
        if (
          lastError.name === 'AbortError' || 
          signal?.aborted ||
          lastError.message.includes('HTTP 4')
        ) {
          break;
        }

        if (attempt < retry) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // exponential backoff
        }
      }
    }

    // Record failed request metrics
    const metrics: NetworkMetrics = {
      responseTime: performance.now() - startTime,
      cacheHit: false,
      retryCount,
      payloadSize: 0,
      timestamp: Date.now()
    };
    this.recordMetrics(url, metrics);

    throw lastError || new Error('Request failed after retries');
  }

  private getCacheKey(url: string, options: RequestConfig): string {
    return `${url}:${JSON.stringify(options)}`;
  }

  private getFromCache<T>(key: string): { data: T } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return { data: entry.data as T };
  }

  private setCache(key: string, data: unknown, ttl: number, etag?: string): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      etag
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private recordMetrics(url: string, metrics: NetworkMetrics): void {
    if (!this.metrics.has(url)) {
      this.metrics.set(url, []);
    }
    
    const urlMetrics = this.metrics.get(url)!;
    urlMetrics.push(metrics);
    
    // Keep only last 100 metrics per URL
    if (urlMetrics.length > 100) {
      urlMetrics.splice(0, urlMetrics.length - 100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        size: JSON.stringify(entry.data).length,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }

  getMetrics(url?: string) {
    if (url) {
      return this.metrics.get(url) || [];
    }
    
    const allMetrics: Record<string, NetworkMetrics[]> = {};
    for (const [key, value] of this.metrics.entries()) {
      allMetrics[key] = value;
    }
    return allMetrics;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Get network performance summary
  getPerformanceSummary() {
    const allMetrics = this.getMetrics();
    const summary: Record<string, any> = {};
    
    for (const [url, metrics] of Object.entries(allMetrics)) {
      if (metrics.length === 0) continue;
      
      const responseTimes = metrics.map(m => m.responseTime);
      const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;
      const avgRetries = metrics.reduce((sum, m) => sum + m.retryCount, 0) / metrics.length;
      
      summary[url] = {
        totalRequests: metrics.length,
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        cacheHitRate: cacheHitRate * 100,
        avgRetries,
        lastRequest: new Date(Math.max(...metrics.map(m => m.timestamp)))
      };
    }
    
    return summary;
  }
}

// Singleton instance
export const networkService = new NetworkService();

// Export types for consumers
export type { NetworkMetrics, RequestConfig };