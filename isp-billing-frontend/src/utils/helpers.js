import { VALIDATION_PATTERNS, ERROR_MESSAGES } from './constants';

// Format bytes to human readable format
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format currency (Kenyan Shillings)
export const formatCurrency = (amount, currency = 'KSh') => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  return `${currency} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Format date
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  return new Date(date).toLocaleDateString('en-US', formatOptions);
};

// Format date and time
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  return formatDate(date);
};

// Validate Kenyan phone number
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    return { isValid: false, message: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  const isValid = VALIDATION_PATTERNS.KENYAN_PHONE.test(phoneNumber);
  return {
    isValid,
    message: isValid ? '' : ERROR_MESSAGES.PHONE_INVALID,
  };
};

// Validate email
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  const isValid = VALIDATION_PATTERNS.EMAIL.test(email);
  return {
    isValid,
    message: isValid ? '' : ERROR_MESSAGES.EMAIL_INVALID,
  };
};

// Validate password
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  const isValid = VALIDATION_PATTERNS.PASSWORD.test(password);
  return {
    isValid,
    message: isValid ? '' : ERROR_MESSAGES.PASSWORD_WEAK,
  };
};

// Validate required field
export const validateRequired = (value, fieldName = 'Field') => {
  const isValid = value && value.toString().trim() !== '';
  return {
    isValid,
    message: isValid ? '' : `${fieldName} is required`,
  };
};

// Format phone number for display
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Convert to international format if it starts with 0
  if (phoneNumber.startsWith('0')) {
    return '+254' + phoneNumber.slice(1);
  }
  
  // Add + if it starts with 254
  if (phoneNumber.startsWith('254')) {
    return '+' + phoneNumber;
  }
  
  return phoneNumber;
};

// Generate random ID
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Deep clone object
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Get status color based on status value
export const getStatusColor = (status, type = 'default') => {
  const statusColors = {
    subscription: {
      active: 'success',
      expired: 'error',
      suspended: 'warning',
      cancelled: 'default',
      pending: 'info',
    },
    payment: {
      completed: 'success',
      pending: 'warning',
      failed: 'error',
      cancelled: 'default',
    },
    invoice: {
      paid: 'success',
      pending: 'warning',
      overdue: 'error',
      cancelled: 'default',
    },
    default: {
      active: 'success',
      inactive: 'default',
      pending: 'warning',
      error: 'error',
      success: 'success',
    },
  };
  
  return statusColors[type]?.[status] || statusColors.default[status] || 'default';
};

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Math.min((value / total) * 100, 100);
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Check if date is overdue
export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

// Get days remaining
export const getDaysRemaining = (endDate) => {
  if (!endDate) return 0;
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
};

// Sort array by key
export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

// Group array by key
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

// Download file
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
};

// Local storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },
};

export default {
  formatBytes,
  formatCurrency,
  formatDate,
  formatDateTime,
  getRelativeTime,
  validatePhoneNumber,
  validateEmail,
  validatePassword,
  validateRequired,
  formatPhoneNumber,
  generateId,
  debounce,
  throttle,
  deepClone,
  getStatusColor,
  calculatePercentage,
  truncateText,
  isOverdue,
  getDaysRemaining,
  sortBy,
  groupBy,
  downloadFile,
  copyToClipboard,
  storage,
};

