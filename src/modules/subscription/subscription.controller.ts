import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  subscribe(@Req() req, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.subscribe(req.user.sub, dto);
  }

  @Get('me')
  getMySubscription(@Req() req) {
    return this.subscriptionService.getMySubscription(req.user.sub);
  }

  @Patch('cancel')
  cancel() {}
}
