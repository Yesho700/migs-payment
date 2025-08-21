import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from './schemas/match.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name)
    private matchModel: Model<MatchDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Listing.name)
    private listingModel: Model<ListingDocument>
  ) {}

  async calculateCompatibility(seekerId: string, listingId: string): Promise<number> {
    const seeker = await this.userModel.findById(seekerId);
    const listing = await this.listingModel.findById(listingId).populate('provider');

    if (!seeker || !listing) {
      return 0;
    }

    const provider = listing.provider as any;
    const preferences = listing.roommatePreferences;

    let totalScore = 0;
    let weightedScore = 0;

    // Gender compatibility (20% weight)
    const genderScore = this.calculateGenderScore(seeker.gender, preferences.gender);
    totalScore += genderScore * 20;
    weightedScore += 20;

    // Food preference compatibility (20% weight)
    const foodScore = this.calculateFoodScore(seeker.foodPreference, preferences.foodPreference);
    totalScore += foodScore * 20;
    weightedScore += 20;

    // Smoking compatibility (15% weight)
    const smokingScore = this.calculateSmokingScore(seeker.smokingPreference, preferences.smokingPreference);
    totalScore += smokingScore * 15;
    weightedScore += 15;

    // Occupation compatibility (15% weight)
    const occupationScore = this.calculateOccupationScore(seeker.occupation, preferences.occupation);
    totalScore += occupationScore * 15;
    weightedScore += 15;

    // Age compatibility (15% weight)
    const ageScore = this.calculateAgeScore(seeker.age, preferences.ageRange);
    totalScore += ageScore * 15;
    weightedScore += 15;

    // Location proximity (15% weight)
    const locationScore = this.calculateLocationScore(seeker.location, listing.location);
    totalScore += locationScore * 15;
    weightedScore += 15;

    return Math.round(totalScore / weightedScore * 100) / 100;
  }

  private calculateGenderScore(seekerGender: string, preferredGender: string): number {
    if (preferredGender === 'any') return 1;
    return seekerGender === preferredGender ? 1 : 0;
  }

  private calculateFoodScore(seekerFood: string, preferredFood: string): number {
    if (preferredFood === 'any') return 1;
    return seekerFood === preferredFood ? 1 : 0.5;
  }

  private calculateSmokingScore(seekerSmoking: string, preferredSmoking: string): number {
    if (preferredSmoking === 'any') return 1;
    return seekerSmoking === preferredSmoking ? 1 : 0;
  }

  private calculateOccupationScore(seekerOccupation: string, preferredOccupation: string): number {
    if (preferredOccupation === 'any') return 1;
    return seekerOccupation === preferredOccupation ? 1 : 0.7;
  }

  private calculateAgeScore(seekerAge: number, ageRange: { min: number; max: number }): number {
    if (!seekerAge || !ageRange) return 0.5;
    if (seekerAge >= ageRange.min && seekerAge <= ageRange.max) return 1;
    
    const deviation = Math.min(
      Math.abs(seekerAge - ageRange.min),
      Math.abs(seekerAge - ageRange.max)
    );
    
    return Math.max(0, 1 - deviation / 10);
  }

  private calculateLocationScore(seekerLocation: any, listingLocation: any): number {
    if (!seekerLocation || !listingLocation) return 0.5;
    
    const distance = this.calculateDistance(
      seekerLocation.coordinates.lat,
      seekerLocation.coordinates.lng,
      listingLocation.coordinates.lat,
      listingLocation.coordinates.lng
    );

    if (distance <= 2) return 1;
    if (distance <= 5) return 0.8;
    if (distance <= 10) return 0.6;
    if (distance <= 20) return 0.4;
    return 0.2;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async generateMatches(seekerId: string): Promise<Match[]> {
    const listings = await this.listingModel
      .find({ 
        isActive: true, 
        adminApprovalStatus: 'approved',
        provider: { $ne: seekerId }
      });

    const matches = [];
    
    const matchArray = listings.map((listing) => {
      const idString = listing._id.toString();

      const compatibilityScore = await this.calculateCompatibility(seekerId, listing._id.toString());
    })
    for (const listing of listings) {
      const compatibilityScore = await this.calculateCompatibility(seekerId, listing._id.toString());
      
      if (compatibilityScore > 30) { // Only create matches above 30% compatibility
        const existingMatch = await this.matchModel.findOne({
          seeker: seekerId,
          listing: listing._id,
        });

        if (!existingMatch) {
          const match = new this.matchModel({
            seeker: seekerId,
            provider: listing.provider,
            listing: listing._id,
            compatibilityScore,
          });
          
          matches.push(await match.save());
        }
      }
    }

    return matches;
  }

  async getMatchesForUser(userId: string, userType: 'seeker' | 'provider'): Promise<Match[]> {
    const query = userType === 'seeker' ? { seeker: userId } : { provider: userId };
    
    return this.matchModel
      .find(query)
      .populate('seeker', 'name profilePicture age occupation')
      .populate('provider', 'name profilePicture age occupation')
      .populate('listing', 'title rentAmount location photos')
      .sort({ compatibilityScore: -1 })
      .exec();
  }

  async updateMatchStatus(matchId: string, status: string): Promise<Match> {
    return this.matchModel
      .findByIdAndUpdate(matchId, { status, isViewed: true }, { new: true })
      .populate('seeker', 'name profilePicture')
      .populate('provider', 'name profilePicture')
      .populate('listing', 'title rentAmount location')
      .exec();
  }

  async getMatchStats(): Promise<any> {
    const total = await this.matchModel.countDocuments();
    const pending = await this.matchModel.countDocuments({ status: 'pending' });
    const accepted = await this.matchModel.countDocuments({ status: 'accepted' });
    const rejected = await this.matchModel.countDocuments({ status: 'rejected' });
    
    return {
      total,
      pending,
      accepted,
      rejected,
      successRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    };
  }
}