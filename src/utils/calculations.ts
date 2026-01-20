import { SelectedTest } from '../types';

export const calculateTotal = (selectedTests: SelectedTest[]): number => {
  return selectedTests.reduce((total, item) => {
    return total + (item.test.price * item.quantity);
  }, 0);
};

export const formatCurrency = (amount: number): string => {
  // Handle undefined, null, or non-number values
  const numericAmount = Number(amount) || 0;
  
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

export const generateReferenceNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LAB${timestamp}${random}`;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-GH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};