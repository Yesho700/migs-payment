import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  age: number;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({ enum: ['student', 'working'] })
  occupation: string;

  @Prop({ enum: ['vegetarian', 'non-vegetarian'] })
  foodPreference: string;

  @Prop({ enum: ['smoker', 'non-smoker'] })
  smokingPreference: string;

  @Prop({ enum: ['introvert', 'extrovert', 'ambivert'] })
  personality: string;

  @Prop()
  bio: string;

  @Prop()
  profilePicture: string;

  @Prop({ type: [String] })
  interests: string[];

  @Prop({
    type: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
  })
  location: {
    city: string;
    state: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String] })
  favorites: string[];

  @Prop({ default: Date.now })
  lastActive: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);