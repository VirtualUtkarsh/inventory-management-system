// client/src/context/DataCacheContext.jsx
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from './AuthContext';

const DataCacheContext = createContext();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const DataCacheProvider = ({ children }) => {
  const { token } = useAuth();
  const cacheRef = useRef({
    inventory: { data: null, timestamp: null, loading: false },
    insets: { data: null, timestamp: null, loading: false },
    outsets: { data: null, timestamp: null, loading: false },
    bins: { data: null, timestamp: null, loading: false }
  });
  
  const requestQueueRef = useRef({
    inventory: [],
    insets: [],
    outsets: [],
    bins: []
  });

  const abortControllersRef = useRef({
    inventory: null,
    insets: null,
    outsets: null,
    bins: null
  });

  // Force update state to trigger re-renders
  const [, forceUpdate] = useState({});

  const isCacheValid = useCallback((cacheEntry) => {
    if (!cacheEntry.data || !cacheEntry.timestamp) return false;
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
  }, []);

  const executeQueuedCallbacks = useCallback((endpoint, data, error = null) => {
    const queue = requestQueueRef.current[endpoint];
    requestQueueRef.current[endpoint] = [];
    
    queue.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(data);
    });
  }, []);

  const fetchData = useCallback(async (endpoint, url) => {
    const cache = cacheRef.current[endpoint];

    // Return cached data if valid
    if (isCacheValid(cache)) {
      return cache.data;
    }

    // If already loading, queue the request
    if (cache.loading) {
      return new Promise((resolve, reject) => {
        requestQueueRef.current[endpoint].push({ resolve, reject });
      });
    }

    // Cancel any existing request
    if (abortControllersRef.current[endpoint]) {
      abortControllersRef.current[endpoint].abort();
    }

    // Start new request
    cache.loading = true;
    abortControllersRef.current[endpoint] = new AbortController();
    forceUpdate({});

    try {
      const { data } = await axiosInstance.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllersRef.current[endpoint].signal
      });

      // Update cache
      cacheRef.current[endpoint] = {
        data,
        timestamp: Date.now(),
        loading: false
      };

      // Execute queued callbacks
      executeQueuedCallbacks(endpoint, data);
      forceUpdate({});

      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error;
      }

      cache.loading = false;
      executeQueuedCallbacks(endpoint, null, error);
      forceUpdate({});
      throw error;
    } finally {
      abortControllersRef.current[endpoint] = null;
    }
  }, [token, isCacheValid, executeQueuedCallbacks]);

  // API methods
  const getInventory = useCallback(() => {
    return fetchData('inventory', '/api/inventory');
  }, [fetchData]);

  const getInsets = useCallback(() => {
    return fetchData('insets', '/api/insets');
  }, [fetchData]);

  const getOutsets = useCallback(() => {
    return fetchData('outsets', '/api/outsets');
  }, [fetchData]);

  const getBins = useCallback(() => {
    return fetchData('bins', '/api/metadata/bins');
  }, [fetchData]);

  // Invalidate cache methods
  const invalidateCache = useCallback((endpoints) => {
    const endpointsArray = Array.isArray(endpoints) ? endpoints : [endpoints];
    
    endpointsArray.forEach(endpoint => {
      if (cacheRef.current[endpoint]) {
        cacheRef.current[endpoint] = {
          data: null,
          timestamp: null,
          loading: false
        };
      }
    });
    
    forceUpdate({});
  }, []);

  const invalidateAll = useCallback(() => {
    Object.keys(cacheRef.current).forEach(key => {
      cacheRef.current[key] = {
        data: null,
        timestamp: null,
        loading: false
      };
    });
    forceUpdate({});
  }, []);

  // Get cached data immediately (for instant UI updates)
  const getCachedData = useCallback((endpoint) => {
    const cache = cacheRef.current[endpoint];
    if (isCacheValid(cache)) {
      return cache.data;
    }
    return null;
  }, [isCacheValid]);

  // Check if endpoint is loading
  const isLoading = useCallback((endpoint) => {
    return cacheRef.current[endpoint]?.loading || false;
  }, []);

  const value = {
    // Fetch methods
    getInventory,
    getInsets,
    getOutsets,
    getBins,
    
    // Cache management
    invalidateCache,
    invalidateAll,
    getCachedData,
    isLoading,
    
    // Cache status
    isCacheValid: (endpoint) => isCacheValid(cacheRef.current[endpoint])
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};