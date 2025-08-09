/**
 * Resource Preloader - Intelligent preloading of critical resources
 * Features:
 * - Critical resource identification
 * - Priority-based loading
 * - Connection type awareness
 * - Memory usage optimization
 */

interface PreloadResource {
  url: string;
  type: 'json' | 'image' | 'font' | 'script' | 'style';
  priority: 'high' | 'medium' | 'low';
  critical?: boolean;
}

class ResourcePreloader {
  private preloadedResources = new Set<string>();
  private preloadQueue: PreloadResource[] = [];
  private isPreloading = false;

  // Critical resources that should be preloaded immediately
  private criticalResources: PreloadResource[] = [
    {
      url: '/data/weekly_stats.json',
      type: 'json',
      priority: 'high',
      critical: true,
    },
    {
      url: '/data/summary.json',
      type: 'json',
      priority: 'high',
      critical: true,
    },
    {
      url: '/data/holdings.json',
      type: 'json',
      priority: 'medium',
    },
  ];

  // Non-critical resources that can be preloaded when bandwidth allows
  private secondaryResources: PreloadResource[] = [
    {
      url: '/data/historical_baseline.json',
      type: 'json',
      priority: 'medium',
    },
    {
      url: '/data/complete_historical_baseline.json',
      type: 'json',
      priority: 'low',
    },
    {
      url: '/data/correlation_analysis.json',
      type: 'json',
      priority: 'low',
    },
  ];

  constructor() {
    this.initializePreloader();
  }

  private async initializePreloader(): Promise<void> {
    // Check if we should preload based on connection
    if (!this.shouldPreload()) {
      console.log('Skipping preload due to slow connection or data saver mode');
      return;
    }

    // Preload critical resources first
    await this.preloadCriticalResources();
    
    // Then preload secondary resources when idle
    this.scheduleSecondaryPreload();
  }

  private shouldPreload(): boolean {
    if (typeof navigator === 'undefined') return false;

    // Check for data saver mode
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection?.saveData) {
        return false;
      }

      // Skip preload on slow connections
      if (connection?.effectiveType && 
          ['slow-2g', '2g'].includes(connection.effectiveType)) {
        return false;
      }
    }

    return true;
  }

  private async preloadCriticalResources(): Promise<void> {
    const criticalPromises = this.criticalResources.map(resource => 
      this.preloadResource(resource)
    );

    try {
      await Promise.allSettled(criticalPromises);
      console.log('Critical resources preloaded successfully');
    } catch (error) {
      console.warn('Some critical resources failed to preload:', error);
    }
  }

  private scheduleSecondaryPreload(): void {
    // Use requestIdleCallback when available, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadSecondaryResources();
      }, { timeout: 5000 });
    } else {
      setTimeout(() => {
        this.preloadSecondaryResources();
      }, 2000);
    }
  }

  private async preloadSecondaryResources(): Promise<void> {
    for (const resource of this.secondaryResources) {
      if (!this.preloadedResources.has(resource.url)) {
        await this.preloadResource(resource);
        // Add small delay between preloads to avoid blocking main thread
        await this.sleep(100);
      }
    }
  }

  private async preloadResource(resource: PreloadResource): Promise<void> {
    if (this.preloadedResources.has(resource.url)) {
      return;
    }

    try {
      switch (resource.type) {
        case 'json':
          await this.preloadJSON(resource.url);
          break;
        case 'image':
          await this.preloadImage(resource.url);
          break;
        case 'font':
          this.preloadFont(resource.url);
          break;
        case 'script':
          this.preloadScript(resource.url);
          break;
        case 'style':
          this.preloadStyle(resource.url);
          break;
      }

      this.preloadedResources.add(resource.url);
    } catch (error) {
      console.warn(`Failed to preload ${resource.url}:`, error);
    }
  }

  private async preloadJSON(url: string): Promise<void> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Store in cache for later use
    const data = await response.json();
    
    // If using our network service, store in its cache
    if (typeof window !== 'undefined' && (window as any).networkService) {
      const networkService = (window as any).networkService;
      networkService.setCachedData?.(url, data, 300000); // 5 minutes
    }
  }

  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  private preloadFont(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
  }

  private preloadScript(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = url;
    document.head.appendChild(link);
  }

  private preloadStyle(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = url;
    document.head.appendChild(link);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods
  public addResource(resource: PreloadResource): void {
    if (!this.preloadedResources.has(resource.url)) {
      this.preloadQueue.push(resource);
      
      if (!this.isPreloading && resource.priority === 'high') {
        this.processQueue();
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    // Sort by priority
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    while (this.preloadQueue.length > 0) {
      const resource = this.preloadQueue.shift()!;
      await this.preloadResource(resource);
    }

    this.isPreloading = false;
  }

  public getPreloadedResources(): string[] {
    return Array.from(this.preloadedResources);
  }

  public clearCache(): void {
    this.preloadedResources.clear();
  }

  // Connection monitoring
  public getConnectionInfo(): any {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return null;
    }

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    };
  }
}

// Create singleton instance
export const resourcePreloader = new ResourcePreloader();

// Export for use in components
export { ResourcePreloader };
export type { PreloadResource };