import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('generate')
  generateMatches(@Request() req) {
    return this.matchesService.generateMatches(req.user.userId);
  }

  @Get()
  getMatches(@Request() req, @Query('type') type: 'seeker' | 'provider' = 'seeker') {
    return this.matchesService.getMatchesForUser(req.user.userId, type);
  }

  @Patch(':id/status')
  updateMatchStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    return this.matchesService.updateMatchStatus(id, body.status);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('stats')
  getMatchStats() {
    return this.matchesService.getMatchStats();
  }
}