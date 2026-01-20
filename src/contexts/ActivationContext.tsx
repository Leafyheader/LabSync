import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface ActivationContextType {
  isActivated: boolean;
  needsActivation: boolean;
  activateApp: (code: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const ActivationContext = createContext<ActivationContextType | undefined>(undefined);

export { ActivationContext };

interface ActivationProviderProps {
  children: ReactNode;
}

export const ActivationProvider: React.FC<ActivationProviderProps> = ({ children }) => {
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [needsActivation, setNeedsActivation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkActivationStatus = async () => {
      try {
        // Perform time validation first to detect client manipulation
        const timeResponse = await api.activation.getServerTime();
        const serverTime = new Date(timeResponse.serverTime);
        const clientTime = new Date();
        const timeDifference = Math.abs(serverTime.getTime() - clientTime.getTime());
        
        // If client time is more than 10 minutes off from server, log warning
        if (timeDifference > 10 * 60 * 1000) {
          console.warn('Client time significantly differs from server time:', {
            serverTime: serverTime.toISOString(),
            clientTime: clientTime.toISOString(),
            difference: timeDifference / 1000 / 60 + ' minutes'
          });
        }

        // Always check backend activation status
        const response = await api.activation.checkStatus();
        const { requiresActivation, serverTime: statusServerTime } = response;
        
        // Store server time for client manipulation detection
        if (statusServerTime) {
          const clientTimeCheck = new Date().toISOString();
          localStorage.setItem('medlab-server-time', statusServerTime);
          localStorage.setItem('medlab-client-time', clientTimeCheck);
          
          // Check for potential client-side time manipulation
          const storedServerTime = localStorage.getItem('medlab-last-server-time');
          if (storedServerTime) {
            const serverTimeDiff = new Date(statusServerTime).getTime() - new Date(storedServerTime).getTime();
            const clientTimeDiff = new Date(clientTimeCheck).getTime() - new Date(localStorage.getItem('medlab-last-client-time') || clientTimeCheck).getTime();
            
            // If time differences are significantly different (more than 5 minutes), potential manipulation
            if (Math.abs(serverTimeDiff - clientTimeDiff) > 5 * 60 * 1000) {
              console.warn('Potential client-side time manipulation detected');
              // Clear any activation status to force re-validation
              localStorage.removeItem('medlab-activated');
              localStorage.removeItem('medlab-activation-date');
              localStorage.removeItem('medlab-activation-server-time');
            }
          }
          
          localStorage.setItem('medlab-last-server-time', statusServerTime);
          localStorage.setItem('medlab-last-client-time', clientTimeCheck);
        }
        
        if (requiresActivation) {
          // Backend requires activation - always enforce this
          // Clear any previous activation status when new activation is required
          localStorage.removeItem('medlab-activated');
          localStorage.removeItem('medlab-activation-date');
          localStorage.removeItem('medlab-activation-server-time');
          setIsActivated(false);
          setNeedsActivation(true);
        } else {
          // Backend says no activation required
          setIsActivated(true);
          setNeedsActivation(false);
          // Clear any old activation status since it's no longer required
          localStorage.removeItem('medlab-activated');
          localStorage.removeItem('medlab-activation-date');
          localStorage.removeItem('medlab-activation-server-time');
        }
      } catch (error) {
        console.error('Failed to check activation status:', error);
        // If API fails, fall back to date-based check for backward compatibility
        const now = new Date();
        const triggerDate = new Date('2025-08-12T00:00:00.000Z');
        const shouldRequireActivation = now >= triggerDate;
        
        if (shouldRequireActivation) {
          const localActivated = localStorage.getItem('medlab-activated') === 'true';
          setIsActivated(localActivated);
          setNeedsActivation(!localActivated);
        } else {
          setIsActivated(true);
          setNeedsActivation(false);
        }
      }
    };

    checkActivationStatus();
    
    // Check every 5 minutes for backend status changes
    const interval = setInterval(checkActivationStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const activateApp = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Client-side validation: code must be non-empty
      if (!code || code.trim().length === 0) {
        setError('Activation code is required');
        return false;
      }

      // Validate code with backend
      const response = await api.activation.validateCode(code.trim());

      if (response.valid && response.requiresActivation) {
        // Code is valid and activation was required
        // Use server time instead of client time for security
        const activationDate = response.serverTime || new Date().toISOString();
        localStorage.setItem('medlab-activated', 'true');
        localStorage.setItem('medlab-activation-date', activationDate);
        localStorage.setItem('medlab-activation-code', code); // Store which code was used
        localStorage.setItem('medlab-activation-server-time', activationDate); // Store server time
        
        setIsActivated(true);
        setNeedsActivation(false);
        return true;
      } else if (response.valid && !response.requiresActivation) {
        // Code is valid but activation is not required (turned off)
        setIsActivated(true);
        setNeedsActivation(false);
        return true;
      } else {
        setError('Invalid activation code. Please check your code and try again.');
        return false;
      }
    } catch (error) {
      console.error('Activation failed:', error);
      // If server provided a JSON error body, show server message
      const errUnknown = error as unknown;
      if (typeof errUnknown === 'object' && errUnknown !== null) {
        const maybeErr = errUnknown as { body?: unknown; message?: unknown };
        if (maybeErr.body && typeof maybeErr.body === 'object') {
          const mb = maybeErr.body as { message?: unknown; error?: unknown };
          if (mb.message || mb.error) {
            setError(String(mb.message ?? mb.error));
            return false;
          }
        }
        if (maybeErr.message) {
          setError(String(maybeErr.message));
          return false;
        }
      }
      setError('Activation failed. Please check your connection and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ActivationContext.Provider value={{
      isActivated,
      needsActivation,
      activateApp,
      isLoading,
      error
    }}>
      {children}
    </ActivationContext.Provider>
  );
};
