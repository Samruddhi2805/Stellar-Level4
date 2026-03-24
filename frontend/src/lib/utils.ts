import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStellarAmount(amount: number): string {
  if (amount === 0) return '0';
  
  // Stellar amounts are in stroops (7 decimal places)
  const xlm = amount / 10000000;
  
  if (xlm < 0.00001) {
    return '< 0.00001';
  }
  
  return xlm.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

export function formatAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject) => {
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        textArea.remove();
      }
    });
  }
}

export function validateStellarAddress(address: string): boolean {
  // Basic validation for Stellar addresses
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Stellar addresses are 56 characters long and start with 'G'
  const stellarAddressRegex = /^G[A-Z0-9]{55}$/;
  return stellarAddressRegex.test(address);
}

export function validateAmount(amount: string): { isValid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Invalid amount' };
  }
  
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  if (numAmount > 1000000) {
    return { isValid: false, error: 'Amount exceeds maximum limit' };
  }
  
  return { isValid: true };
}

export function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateFee(amount: number, feeRate: number): number {
  return Math.max(100, Math.floor((amount * feeRate) / 10000));
}

export function calculateCashback(amount: number, cashbackRate: number): number {
  return Math.floor((amount * cashbackRate) / 10000);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error?.message) {
    return error.error.message;
  }
  
  return 'An unexpected error occurred';
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getNetworkIcon(network: 'testnet' | 'public'): string {
  return network === 'testnet' 
    ? '🧪' 
    : '🌐';
}

export function getStatusColor(status: 'success' | 'error' | 'pending' | 'warning'): string {
  switch (status) {
    case 'success':
      return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'error':
      return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'pending':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'warning':
      return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  }
}
