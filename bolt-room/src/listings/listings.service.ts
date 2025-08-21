import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(Listing.name) private listingModel: Model<ListingDocument>,
  ) {}

  async create(createListingDto: CreateListingDto, userId: string): Promise<Listing> {
    const createdListing = new this.listingModel({
      ...createListingDto,
      provider: userId,
    });

    return createdListing.save();
  }

  async findAll(filters?: any, userId?: string): Promise<Listing[]> {
    const query: any = { isActive: true, adminApprovalStatus: 'approved' };
    
    if (filters.location) {
      query['location.city'] = new RegExp(filters.location, 'i');
    }
    
    if (filters.minRent || filters.maxRent) {
      query.rentAmount = {};
      if (filters.minRent) query.rentAmount.$gte = filters.minRent;
      if (filters.maxRent) query.rentAmount.$lte = filters.maxRent;
    }
    
    if (filters.gender) {
      query['roommatePreferences.gender'] = { $in: [filters.gender, 'any'] };
    }
    
    if (filters.foodPreference) {
      query['roommatePreferences.foodPreference'] = { $in: [filters.foodPreference, 'any'] };
    }
    
    if (filters.occupation) {
      query['roommatePreferences.occupation'] = { $in: [filters.occupation, 'any'] };
    }

    // Exclude current user's listings
    if (userId) {
      query.provider = { $ne: userId };
    }

    return this.listingModel
      .find(query)
      .populate('provider', 'name profilePicture')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Listing> {
    const listing = await this.listingModel
      .findById(id)
      .populate('provider', 'name profilePicture age occupation foodPreference smokingPreference')
      .exec();

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Increment view count
    await this.listingModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    return listing;
  }

  async findByProvider(providerId: string): Promise<Listing[]> {
    return this.listingModel
      .find({ provider: providerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateListingDto: UpdateListingDto, userId: string): Promise<Listing> {
    const listing = await this.listingModel.findById(id);
    
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    
    if (listing.provider.toString() !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const updatedListing = await this.listingModel
      .findByIdAndUpdate(id, updateListingDto, { new: true })
      .populate('provider', 'name profilePicture')
      .exec();

    if(!updatedListing)
      throw new NotFoundException("Listing Not Found!!");

    return updatedListing;
  }

  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.listingModel.findById(id);
    
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    
    if (listing.provider.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.listingModel.findByIdAndDelete(id);
  }

  async updateStatus(id: string, status: string): Promise<Listing> {
    const listing = await this.listingModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('provider', 'name profilePicture')
      .exec();

      if(!listing)
        throw new NotFoundException('Listing Not Found!!');

      return listing;
  }

  async approveRejectListing(id: string, status: 'approved' | 'rejected'): Promise<Listing> {
    const listing = await this.listingModel
      .findByIdAndUpdate(id, { adminApprovalStatus: status }, { new: true })
      .populate('provider', 'name profilePicture')
      .exec();
    
    if(!listing)  
      throw new NotFoundException("Listing Not Found!!");
    
    return listing;
  }

  async getListingStats(): Promise<any> {
    const total = await this.listingModel.countDocuments();
    const active = await this.listingModel.countDocuments({ status: 'available' });
    const filled = await this.listingModel.countDocuments({ status: 'filled' });
    const pending = await this.listingModel.countDocuments({ adminApprovalStatus: 'pending' });
    
    return {
      total,
      active,
      filled,
      pending,
    };
  }

  async searchNearby(lat: number, lng: number, radius: number = 5): Promise<Listing[]> {
    return this.listingModel
      .find({
        isActive: true,
        adminApprovalStatus: 'approved',
        'location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radius * 1000, // Convert to meters
          },
        },
      })
      .populate('provider', 'name profilePicture')
      .exec();
  }
}