import { useContext } from 'react';
import { ActivationContext } from '../contexts/ActivationContext';

export const useActivation = () => {
  const context = useContext(ActivationContext);
  if (context === undefined) {
    throw new Error('useActivation must be used within an ActivationProvider');
  }
  return context;
};
