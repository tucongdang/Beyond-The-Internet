import { useState, useEffect } from 'react';

export type NetworkStatus = 'STABLE' | 'DELAYED' | 'OFFLINE';

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>('STABLE');

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setStatus('OFFLINE');
        return;
      }

      // Use Network Information API if available
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.rtt > 400) {
          setStatus('DELAYED');
        } else {
          setStatus('STABLE');
        }
      } else {
        setStatus('STABLE');
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // Listen to connection changes if supported
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', updateStatus);
    }

    // Initial check
    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
};
