import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('payment_transactions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchant_txn_ref: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order_info: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'AED',
    },
    customer_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'cancelled', 'refunded', 'partially_refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    response_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    response_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    auth_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    batch_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    return_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vpc_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    gateway_response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    refunded_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Create indexes
  await queryInterface.addIndex('payment_transactions', ['merchant_txn_ref']);
  await queryInterface.addIndex('payment_transactions', ['transaction_id']);
  await queryInterface.addIndex('payment_transactions', ['status']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('payment_transactions');
}
