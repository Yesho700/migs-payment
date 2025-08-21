import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'webhook_logs',
  timestamps: true,
})
export class WebhookLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  transaction_id: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  payload: object;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  signature: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  processed: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}