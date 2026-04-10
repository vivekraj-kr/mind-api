import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.plan.findMany();
  }

  async subscribe(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  }

  async getMySubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription');
    }

    return this.prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: 'CANCELLED',
        endDate: new Date(),
      },
    });
  }
}
