// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 10000,
};

// Application Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  DATA_PLANS: '/data-plans',
  SUBSCRIPTIONS: '/subscriptions',
  PAYMENTS: '/payments',
  INVOICES: '/invoices',
  DATA_USAGE: '/data-usage',
  PROFILE: '/profile',
  ADMIN: '/admin',
};

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  SUPPORT: 'support',
};

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Invoice Status
export const INVOICE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

// Data Plan Categories
export const PLAN_CATEGORIES = {
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
};

// Payment Methods
export const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  CARD: 'card',
  BANK: 'bank',
};

// Theme Configuration
export const THEME_CONFIG = {
  PRIMARY_COLOR: '#1976d2',
  SECONDARY_COLOR: '#dc004e',
  SUCCESS_COLOR: '#2e7d32',
  WARNING_COLOR: '#ed6c02',
  ERROR_COLOR: '#d32f2f',
  INFO_COLOR: '#0288d1',
};

// Kenyan Counties
export const KENYAN_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui',
  'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
  'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

// Validation Patterns
export const VALIDATION_PATTERNS = {
  KENYAN_PHONE: /^(254|0)[17]\d{8}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NATIONAL_ID: /^\d{7,8}$/,
  PASSWORD: /^.{6,}$/, // At least 6 characters
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PHONE_INVALID: 'Please enter a valid Kenyan phone number (e.g., 0712345678)',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_WEAK: 'Password must be at least 6 characters long',
  REQUIRED_FIELD: 'This field is required',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful! Welcome back.',
  REGISTER_SUCCESS: 'Registration successful! Please log in.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  SUBSCRIPTION_CREATED: 'Subscription created successfully.',
  PAYMENT_INITIATED: 'Payment initiated. Please check your phone for M-Pesa prompt.',
  INVOICE_DOWNLOADED: 'Invoice downloaded successfully.',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
};

// Chart Colors
export const CHART_COLORS = [
  '#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#d32f2f',
  '#0288d1', '#7b1fa2', '#5d4037', '#455a64', '#e65100'
];

export default {
  API_CONFIG,
  ROUTES,
  USER_ROLES,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  INVOICE_STATUS,
  PLAN_CATEGORIES,
  PAYMENT_METHODS,
  THEME_CONFIG,
  KENYAN_COUNTIES,
  VALIDATION_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  DATE_FORMATS,
  PAGINATION,
  FILE_UPLOAD,
  CHART_COLORS,
};

