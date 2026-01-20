import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

interface UseAutoLogoutOptions {
  timeoutMinutes?: number; // Default: 10 minutes
  events?: string[]; // Events to track for activity
}

export const useAutoLogout = (options: UseAutoLogoutOptions = {}) => {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    timeoutMinutes = 10, 
    events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'] 
  } = options;

  const timeoutMs = timeoutMinutes * 60 * 1000;

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.log('⏱️ Auto-logout due to inactivity');
        logout();
      }, timeoutMs);
    }
  }, [isAuthenticated, logout, timeoutMs]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timer if user is not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Set initial timer
    resetTimer();

    // Add event listeners for user activity
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimer, handleActivity, events]);

  return { resetTimer };
};
