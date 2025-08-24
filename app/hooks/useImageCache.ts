'use client';

import { useEffect, useCallback, useRef } from 'react';

interface ImageCacheEntry {
  url: string;
  loaded: boolean;
  error: boolean;
  timestamp: number;
}

// 全局圖片快取，跨組件共享
const imageCache = new Map<string, ImageCacheEntry>();
const CACHE_EXPIRY = 1000 * 60 * 30; // 30分鐘過期

/**
 * 圖片快取和預載 Hook
 * 提供智能圖片載入、錯誤處理和記憶功能
 */
export const useImageCache = () => {
  const loadingSet = useRef<Set<string>>(new Set());

  /**
   * 預載圖片
   */
  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 檢查快取
      const cached = imageCache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        if (cached.loaded) {
          resolve();
          return;
        }
        if (cached.error) {
          reject(new Error('Image failed to load (cached)'));
          return;
        }
      }

      // 避免重複載入同一張圖片
      if (loadingSet.current.has(url)) {
        // 等待現有的載入完成
        const checkLoading = () => {
          if (!loadingSet.current.has(url)) {
            const entry = imageCache.get(url);
            if (entry?.loaded) {
              resolve();
            } else {
              reject(new Error('Image failed to load'));
            }
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
        return;
      }

      loadingSet.current.add(url);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        imageCache.set(url, {
          url,
          loaded: true,
          error: false,
          timestamp: Date.now()
        });
        loadingSet.current.delete(url);
        resolve();
      };

      img.onerror = () => {
        imageCache.set(url, {
          url,
          loaded: false,
          error: true,
          timestamp: Date.now()
        });
        loadingSet.current.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }, []);

  /**
   * 批量預載圖片
   */
  const preloadImages = useCallback(async (urls: string[]): Promise<{
    success: string[];
    failed: string[];
  }> => {
    const results = await Promise.allSettled(
      urls.map(url => preloadImage(url))
    );

    const success: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success.push(urls[index]);
      } else {
        failed.push(urls[index]);
      }
    });

    return { success, failed };
  }, [preloadImage]);

  /**
   * 檢查圖片是否已載入
   */
  const isImageLoaded = useCallback((url: string): boolean => {
    const cached = imageCache.get(url);
    return cached?.loaded === true && Date.now() - cached.timestamp < CACHE_EXPIRY;
  }, []);

  /**
   * 檢查圖片載入是否失敗
   */
  const isImageError = useCallback((url: string): boolean => {
    const cached = imageCache.get(url);
    return cached?.error === true && Date.now() - cached.timestamp < CACHE_EXPIRY;
  }, []);

  /**
   * 清理過期快取
   */
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    for (const [url, entry] of imageCache.entries()) {
      if (now - entry.timestamp > CACHE_EXPIRY) {
        imageCache.delete(url);
      }
    }
  }, []);

  /**
   * 獲取快取統計
   */
  const getCacheStats = useCallback(() => {
    const total = imageCache.size;
    const loaded = Array.from(imageCache.values()).filter(entry => entry.loaded).length;
    const failed = Array.from(imageCache.values()).filter(entry => entry.error).length;
    
    return {
      total,
      loaded,
      failed,
      hitRate: total > 0 ? loaded / total : 0
    };
  }, []);

  // 定期清理過期快取
  useEffect(() => {
    const interval = setInterval(cleanupCache, 1000 * 60 * 5); // 每5分鐘清理一次
    return () => clearInterval(interval);
  }, [cleanupCache]);

  return {
    preloadImage,
    preloadImages,
    isImageLoaded,
    isImageError,
    cleanupCache,
    getCacheStats
  };
};

export default useImageCache;