import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomRequest, RequestDocument } from './schemas/request.schema';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(RoomRequest.name) private requestModel: Model<RequestDocument>,
  ) {}

  async create(createRequestDto: CreateRequestDto, seekerId: string): Promise<RoomRequest> {
    // Check if request already exists
    const existingRequest = await this.requestModel.findOne({
      seeker: seekerId,
      listing: createRequestDto.listing,
    });

    if (existingRequest) {
      throw new ForbiddenException('You have already sent a request for this listing');
    }

    const request = new this.requestModel({
      ...createRequestDto,
      seeker: seekerId,
    });

    return request.save();
  }

  async getRequestsForSeeker(seekerId: string): Promise<RoomRequest[]> {
    return this.requestModel
      .find({ seeker: seekerId })
      .populate('provider', 'name profilePicture')
      .populate('listing', 'title rentAmount location photos')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getRequestsForProvider(providerId: string): Promise<RoomRequest[]> {
    return this.requestModel
      .find({ provider: providerId })
      .populate('seeker', 'name profilePicture age occupation foodPreference smokingPreference')
      .populate('listing', 'title rentAmount location')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateRequestStatus(
    requestId: string,
    status: string,
    providerId: string,
    responseMessage?: string
  ): Promise<RoomRequest> {
    const request = await this.requestModel.findById(requestId);
    
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    
    if (request.provider.toString() !== providerId) {
      throw new ForbiddenException('You can only respond to your own listing requests');
    }

    return this.requestModel
      .findByIdAndUpdate(
        requestId,
        {
          status,
          responseMessage,
          responseDate: new Date(),
          isViewedByProvider: true,
        },
        { new: true }
      )
      .populate('seeker', 'name profilePicture')
      .populate('listing', 'title rentAmount location')
      .exec();
  }

  async markAsViewed(requestId: string, providerId: string): Promise<RoomRequest> {
    const request = await this.requestModel.findById(requestId);
    
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    
    if (request.provider.toString() !== providerId) {
      throw new ForbiddenException('Unauthorized');
    }

    return this.requestModel
      .findByIdAndUpdate(requestId, { isViewedByProvider: true }, { new: true })
      .exec();
  }

  async getRequestStats(): Promise<any> {
    const total = await this.requestModel.countDocuments();
    const pending = await this.requestModel.countDocuments({ status: 'pending' });
    const accepted = await this.requestModel.countDocuments({ status: 'accepted' });
    const rejected = await this.requestModel.countDocuments({ status: 'rejected' });
    
    return {
      total,
      pending,
      accepted,
      rejected,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    };
  }
}