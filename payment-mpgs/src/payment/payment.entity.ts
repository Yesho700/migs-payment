import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, CreatedAt, UpdatedAt } from 'sequelize-typescript';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  VOID = 'VOID'
}

@Table({
  tableName: 'payments',
  timestamps: true,
})
export class Payment extends Model<Payment, Partial<Payment>> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false
  })
  orderId: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false
  })
  transactionId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  gatewayTransactionId: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  amount: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  })
  currency: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(PaymentStatus),
    defaultValue: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({
    type: DataType.ENUM,
    values: Object.values(TransactionType),
    defaultValue: TransactionType.PAYMENT
  })
  type: TransactionType;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  customerId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  customerEmail: string;

  @Column({
    type: DataType.JSON,
    allowNull: true
  })
  gatewayResponse: object;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  errorMessage: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  refundedAmount: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  refundTransactionId: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata: object;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}