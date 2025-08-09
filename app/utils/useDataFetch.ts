'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { networkService, NetworkMetrics, RequestConfig } from './networkService';

interface UseDataFetchOptions extends RequestConfig {
  staleTime?: number; // milliseconds to consider data stale
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  enabled?: boolean;
  fallbackData?: unknown;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  metrics?: NetworkMetrics;
  refetch: () => void;
  isStale: boolean;
}

export function useDataFetch<T = unknown>(
  url: string,
  options: UseDataFetchOptions = {}
): UseDataFetchResult<T> {
  const {
    staleTime = 300000, // 5 minutes
    refetchOnFocus = true,
    refetchOnReconnect = true,
    enabled = true,
    fallbackData,
    ...networkOptions
  } = options;

  const [data, setData] = useState<T | null>(fallbackData as T || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<NetworkMetrics | undefined>();
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const abortControllerRef = useRef<AbortController>();
  const isInitialMount = useRef(true);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check if data is still fresh
    if (!force && data && Date.now() - lastFetch < staleTime) {
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await networkService.fetch<T>(url, {
        ...networkOptions,
        signal: abortControllerRef.current.signal,
      });

      if (!abortControllerRef.current.signal.aborted) {
        setData(result.data);
        setMetrics(result.metrics);
        setLastFetch(Date.now());
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        // Keep stale data on error if available
        if (!data && fallbackData) {
          setData(fallbackData as T);
        }
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [url, enabled, data, lastFetch, staleTime, fallbackData, networkOptions]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchData();
    }
  }, [fetchData]);

  // Refetch on focus
  useEffect(() => {
    if (!refetchOnFocus || typeof window === 'undefined') return;

    const handleFocus = () => {
      // Only refetch if data is stale
      if (Date.now() - lastFetch > staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, fetchData, lastFetch, staleTime]);

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect || typeof window === 'undefined') return;

    const handleOnline = () => {
      if (error) {
        fetchData(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, fetchData, error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isStale = Date.now() - lastFetch > staleTime;

  return {
    data,
    loading,
    error,
    metrics,
    refetch,
    isStale,
  };
}

// Hook for fetching multiple resources
export function useDataFetchMultiple(
  urls: string[],
  options: UseDataFetchOptions = {}
): {
  data: Record<string, unknown>;
  loading: boolean;
  errors: Record<string, Error>;
  refetch: () => void;
} {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, Error>>({});

  const fetchAll = useCallback(async (force = false) => {
    setLoading(true);
    setErrors({});

    const promises = urls.map(async (url) => {
      try {
        const result = await networkService.fetch(url, options);
        return { url, data: result.data, error: null };
      } catch (error) {
        return { url, data: null, error: error as Error };
      }
    });

    const results = await Promise.all(promises);
    
    const newData: Record<string, unknown> = {};
    const newErrors: Record<string, Error> = {};

    results.forEach(({ url, data: resultData, error }) => {
      if (error) {
        newErrors[url] = error;
      } else {
        newData[url] = resultData;
      }
    });

    setData(newData);
    setErrors(newErrors);
    setLoading(false);
  }, [urls, options]);

  const refetch = useCallback(() => {
    fetchAll(true);
  }, [fetchAll]);

  useEffect(() => {
    if (urls.length > 0) {
      fetchAll();
    }
  }, [fetchAll]);

  return { data, loading, errors, refetch };
}

// Hook for preloading data
export function usePreloadData(urls: string[], options: RequestConfig = {}): void {
  useEffect(() => {
    // Only preload on good connections
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && (connection.saveData || connection.effectiveType === 'slow-2g')) {
        return; // Skip preloading on slow connections
      }
    }

    const preload = async () => {
      // Preload with lower priority
      await Promise.allSettled(
        urls.map(url => 
          networkService.fetch(url, {
            ...options,
            ttl: 900000, // 15 minutes cache for preloaded data
          })
        )
      );
    };

    // Preload after a short delay to not block initial rendering
    const timeoutId = setTimeout(preload, 100);
    return () => clearTimeout(timeoutId);
  }, [urls, options]);
}