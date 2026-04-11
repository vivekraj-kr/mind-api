import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [PaymentController],
  providers: [],
})
export class PaymentModule {}
