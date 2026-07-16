'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper to check if table exists
    const createTableIfMissing = async (tableName, columns) => {
      const exists = await queryInterface.tableExists(tableName);
      if (!exists) {
        await queryInterface.createTable(tableName, columns);
      }
    };

    // 1. settings
    await createTableIfMissing('settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      value: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'general',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 2. audit_logs
    await createTableIfMissing('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      resource_type: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 3. notifications
    await createTableIfMissing('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('info', 'warning', 'error', 'success'),
        allowNull: true,
        defaultValue: 'info',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_read: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 4. data_plans
    await createTableIfMissing('data_plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      data_limit: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      validity_period: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      speed: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      plan_type: {
        type: Sequelize.ENUM('prepaid', 'postpaid'),
        allowNull: false,
        defaultValue: 'prepaid',
      },
      category: {
        type: Sequelize.ENUM('basic', 'standard', 'premium', 'enterprise'),
        allowNull: false,
        defaultValue: 'basic',
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1,
      },
      is_popular: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      upload_speed_kbps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      download_speed_kbps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      burst_upload_kbps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      burst_download_kbps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      session_timeout_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 5. subscriptions
    await createTableIfMissing('subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      subscription_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'expired', 'suspended', 'cancelled'),
        allowNull: true,
        defaultValue: 'pending',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      data_used: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: 0,
      },
      data_remaining: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      auto_renew: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0,
      },
      renewal_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      activated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      suspended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      suspension_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      cancellation_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      connection_type: {
        type: Sequelize.ENUM('pppoe', 'hotspot', 'static', 'address_list', 'voucher'),
        allowNull: true,
      },
      network_device_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      network_identifier: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      grace_period_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 24,
      },
      provisioning_retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_provisioning_attempt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reminder_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      radius_password_encrypted: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      radius_password_iv: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      radius_password_tag: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      last_download_bytes_counter: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      last_upload_bytes_counter: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 6. invoices
    await createTableIfMissing('invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      invoice_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      billing_period_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      billing_period_end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      issue_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'KES',
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'partial', 'paid', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_method: {
        type: Sequelize.ENUM('mpesa', 'cash', 'card', 'bank_transfer'),
        allowNull: true,
      },
      paid_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      pdf_path: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reminders_sent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_reminder_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 7. invoice_items
    await createTableIfMissing('invoice_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      item_type: {
        type: Sequelize.ENUM('subscription', 'installation', 'router', 'other'),
        allowNull: false,
        defaultValue: 'subscription',
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.00,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      discount_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 8. payments
    await createTableIfMissing('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'KES',
      },
      phone_number: {
        type: Sequelize.STRING(15),
        allowNull: true,
      },
      checkout_request_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      merchant_request_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      mpesa_receipt_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_method: {
        type: Sequelize.ENUM('mpesa', 'cash', 'card', 'bank_transfer'),
        allowNull: false,
        defaultValue: 'mpesa',
      },
      payment_type: {
        type: Sequelize.ENUM('subscription', 'installation', 'router', 'other'),
        allowNull: false,
        defaultValue: 'subscription',
      },
      reference: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      callback_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      max_retries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      initiated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 9. support_tickets
    await createTableIfMissing('support_tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: true,
        defaultValue: 'low',
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: true,
        defaultValue: 'open',
      },
      category: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 10. ticket_replies
    await createTableIfMissing('ticket_replies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_internal: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface) => {
    // Drop in reverse dependency order
    await queryInterface.dropTable('ticket_replies');
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('invoice_items');
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('data_plans');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('settings');
  },
};
