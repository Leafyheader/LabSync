// Activation System Testing Utilities
// This file contains utilities for testing the activation system

export const ACTIVATION_UTILS = {
  // The correct activation code
  CODE: 'MEDLAB2025',
  
  // Trigger date: August 12, 2025 (3 days from August 9, 2025)
  TRIGGER_DATE: new Date('2025-08-12T00:00:00.000Z'),
  
  // Test utilities
  forceActivationRequired: () => {
    localStorage.removeItem('medlab-activated');
    localStorage.removeItem('medlab-activation-date');
    // Temporarily set a past trigger date for testing
    localStorage.setItem('medlab-test-trigger', 'true');
  },
  
  clearActivation: () => {
    localStorage.removeItem('medlab-activated');
    localStorage.removeItem('medlab-activation-date');
    localStorage.removeItem('medlab-test-trigger');
  },
  
  checkStatus: () => {
    const activated = localStorage.getItem('medlab-activated');
    const activationDate = localStorage.getItem('medlab-activation-date');
    const testTrigger = localStorage.getItem('medlab-test-trigger');
    
    console.log('Activation Status:', {
      activated: activated === 'true',
      activationDate,
      testTrigger: testTrigger === 'true',
      triggerDate: ACTIVATION_UTILS.TRIGGER_DATE.toISOString(),
      currentTime: new Date().toISOString()
    });
  }
};

// Make it available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).ACTIVATION_UTILS = ACTIVATION_UTILS;
}
