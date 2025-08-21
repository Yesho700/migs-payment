import { Match, MatchSchema } from './schemas/match.schema';
import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports:[
    MongooseModule.forFeature([
      {name: Match.name, schema: MatchSchema}
    ])
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
