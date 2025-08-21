import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestDocument = RoomRequest & Document;

@Schema({ timestamps: true })
export class RoomRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seeker: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  provider: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listing: Types.ObjectId;

  @Prop()
  message: string;

  @Prop({ enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ default: false })
  isViewedByProvider: boolean;

  @Prop()
  responseMessage: string;

  @Prop()
  responseDate: Date;
}

export const RequestSchema = SchemaFactory.createForClass(RoomRequest);