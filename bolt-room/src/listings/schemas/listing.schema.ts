import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ListingDocument = Listing & Document;

@Schema({ timestamps: true })
export class Listing {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  provider: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  rentAmount: number;

  @Prop({ required: true })
  deposit: number;

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    required: true,
  })
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  @Prop({ type: [String] })
  photos: string[];

  @Prop({
    type: {
      wifi: { type: Boolean, default: false },
      ac: { type: Boolean, default: false },
      laundry: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      food: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      powerBackup: { type: Boolean, default: false },
    },
  })
  facilities: {
    wifi: boolean;
    ac: boolean;
    laundry: boolean;
    parking: boolean;
    food: boolean;
    gym: boolean;
    powerBackup: boolean;
  };

  @Prop({
    type: {
      gender: { type: String, enum: ['male', 'female', 'any'] },
      foodPreference: { type: String, enum: ['vegetarian', 'non-vegetarian', 'any'] },
      smokingPreference: { type: String, enum: ['smoker', 'non-smoker', 'any'] },
      occupation: { type: String, enum: ['student', 'working', 'any'] },
      ageRange: {
        min: Number,
        max: Number,
      },
    },
  })
  roommatePreferences: {
    gender: string;
    foodPreference: string;
    smokingPreference: string;
    occupation: string;
    ageRange: {
      min: number;
      max: number;
    };
  };

  @Prop({ enum: ['available', 'filled', 'pending'], default: 'available' })
  status: string;

  @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  adminApprovalStatus: string;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  inquiryCount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);