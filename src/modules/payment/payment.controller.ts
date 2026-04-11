import { Body, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/auth.guard';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  createOrder(@Req() req, @Body('planId') planId: string) {
    return this.paymentService.createOrder(req.user.sub, planId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyPayment(@Req() req, @Body() body: any) {
    return this.paymentService.verifyPayment(
      req.user.sub,
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
      body.planId,
    );
  }
}
