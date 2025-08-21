import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MatchDocument = Match & Document;

@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seeker: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  provider: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listing: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 100 })
  compatibilityScore: number;

  @Prop({
    type: {
      genderMatch: Number,
      foodMatch: Number,
      smokingMatch: Number,
      occupationMatch: Number,
      ageMatch: Number,
      locationMatch: Number,
    },
  })
  scoreBreakdown: {
    genderMatch: number;
    foodMatch: number;
    smokingMatch: number;
    occupationMatch: number;
    ageMatch: number;
    locationMatch: number;
  };

  @Prop({ enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ default: false })
  isViewed: boolean;
}

export const MatchSchema = SchemaFactory.createForClass(Match);