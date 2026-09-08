import { BadRequestException, Body, Controller, Headers, Param, ParseEnumPipe, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { PaymentProviderCode } from '../generated/prisma/enums.js';
import { PaymentsService } from './payments.service.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @Post('initiate')
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.id, dto);
  }

  @Public()
  @Post('webhooks/:provider')
  async handleWebhook(
    @Param('provider', new ParseEnumPipe(PaymentProviderCode)) provider: PaymentProviderCode,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw request body');
    return this.paymentsService.handleWebhook(provider, { rawBody: req.rawBody.toString('utf8'), headers });
  }
}
