'use client';

import { useEffect } from 'react';

export default function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent the default browser behavior
      event.preventDefault();
      
      // In production, you might want to send this to an error reporting service
      if (process.env.NODE_ENV === 'production') {
        // Send to error reporting service (e.g., Sentry)
        console.warn('Unhandled promise rejection in production:', event.reason);
      }
    };

    // Handle JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('JavaScript error:', event.error);
      
      // In production, you might want to send this to an error reporting service
      if (process.env.NODE_ENV === 'production') {
        console.warn('JavaScript error in production:', event.error);
      }
    };

    // Handle resource loading errors
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target) {
        console.error('Resource loading error:', target.tagName, target);
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    window.addEventListener('error', handleResourceError, true); // Use capture phase for resource errors

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('error', handleResourceError, true);
    };
  }, []);

  return null; // This component doesn't render anything
}