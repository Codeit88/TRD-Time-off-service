import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Headers,
  Req,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SyncService } from './sync.service';
import { BatchBalanceIngestDto } from './dto/batch-balance.dto';

@Controller('sync')
class SyncController {
  constructor(
    @Inject(SyncService)
    sync,
  ) {
    this.sync = sync;
  }

  @Post('balances/batch')
  async batch(
    @Body() raw,
    @Headers('x-correlation-id') headerCorrelation,
    @Req() req,
  ) {
    const body = plainToInstance(BatchBalanceIngestDto, raw);
    const errors = await validate(body);
    if (errors.length) {
      throw new BadRequestException(errors);
    }
    const correlationId =
      headerCorrelation || req.correlationId || null;
    return this.sync.ingestBatch(body.items, correlationId);
  }
}
export { SyncController };
