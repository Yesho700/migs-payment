import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  Index,
} from 'sequelize-typescript';

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum TransactionType {
  CARD_PAYMENT = 'card_payment',
  UTILITY_BILL = 'utility_bill',
  FUND_TRANSFER = 'fund_transfer',
  APPLE_PAY = 'apple_pay',
  SAMSUNG_PAY = 'samsung_pay',
}

@Table({
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['mashreq_transaction_id'] },
    { fields: ['created_at'] },
  ],
})
export class Transaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  order_id: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  mashreq_transaction_id: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
    allowNull: false,
  })
  type: TransactionType;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
    defaultValue: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'AED',
  })
  currency: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  customer_email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  customer_id: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  payment_details: object;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  mashreq_response: object;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  failure_reason: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  redirect_url: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}