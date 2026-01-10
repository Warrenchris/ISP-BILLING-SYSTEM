/**
 * Centralized constants for the application
 */

const PaymentStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    REFUNDED: 'refunded'
};

const SubscriptionStatus = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    PENDING: 'pending' // Initial state before payment
};

const InvoiceStatus = {
    PENDING: 'pending',
    PAID: 'paid',
    PARTIAL: 'partial',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    DRAFT: 'draft',
    SENT: 'sent',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled'
};

const DataUsageStatus = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    TERMINATED: 'terminated',
    ERROR: 'error'
};

const UserStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended'
};

const UserRole = {
    CUSTOMER: 'customer',
    ADMIN: 'admin',
    SUPPORT: 'support'
};

module.exports = {
    PaymentStatus,
    SubscriptionStatus,
    InvoiceStatus,
    DataUsageStatus,
    UserStatus,
    UserRole
};
