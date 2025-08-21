import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  Unique,
} from 'sequelize-typescript';

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

@Table({
  tableName: 'payment_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'payment_transactions_merchant_txn_ref',
      fields: ['merchant_txn_ref'],  // DB column name, not property name
      unique: true,
    },
    {
      name: 'payment_transactions_transaction_id',
      fields: ['transaction_id'],
    },
    {
      name: 'payment_transactions_status',
      fields: ['status'],
    },
  ],
})
export default class PaymentTransaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'merchant_txn_ref',
  })
  merchantTxnRef: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'transaction_id',
  })
  transactionId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'order_info',
  })
  orderInfo: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Default('AED')
  @Column({
    type: DataType.STRING(3),
    allowNull: false,
  })
  currency: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'customer_email',
  })
  customerEmail: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'customer_phone',
  })
  customerPhone: string;

  @Default(TransactionStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
  })
  status: TransactionStatus;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'response_code',
  })
  responseCode: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'response_message',
  })
  responseMessage: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'auth_code',
  })
  authCode: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'receipt_no',
  })
  receiptNo: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'batch_no',
  })
  batchNo: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'return_url',
  })
  returnUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'client_ip',
  })
  clientIp: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'vpc_data',
  })
  vpcData: Record<string, any>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'gateway_response',
  })
  gatewayResponse: Record<string, any>;

  @Default(0)
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    field: 'refunded_amount',
  })
  refundedAmount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'processed_at',
  })
  processedAt: Date;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  declare updatedAt: Date;
}
