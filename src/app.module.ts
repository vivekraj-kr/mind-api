import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [AuthModule, SubscriptionModule, PaymentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
