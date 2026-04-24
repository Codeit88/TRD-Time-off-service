import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TimeOffService } from './time-off.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';

@Controller('time-off')
class TimeOffController {
  constructor(
    @Inject(TimeOffService)
    timeOff,
  ) {
    this.timeOff = timeOff;
  }

  @Post('requests')
  async create(
    @Body() raw,
    @Headers('x-correlation-id') headerCorrelation,
    @Req() req,
  ) {
    const body = plainToInstance(CreateTimeOffRequestDto, raw);
    const errors = await validate(body);
    if (errors.length) {
      throw new BadRequestException(errors);
    }
    const correlationId =
      headerCorrelation || req.correlationId || null;
    const row = await this.timeOff.createRequest(body, correlationId);
    return this.serialize(row);
  }

  @Get('requests/:id')
  async one(@Param('id') id) {
    const row = await this.timeOff.getRequest(id);
    return this.serialize(row);
  }

  @Patch('requests/:id/approve')
  async approve(
    @Param('id') id,
    @Body() _raw,
    @Headers('x-correlation-id') headerCorrelation,
    @Req() req,
  ) {
    const correlationId =
      headerCorrelation || req.correlationId || null;
    const row = await this.timeOff.approveRequest(id, correlationId);
    return this.serialize(row);
  }

  serialize(row) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      locationId: row.locationId,
      days: row.days,
      status: row.status,
      balanceVersionAtSubmit: row.balanceVersionAtSubmit,
      hcmValidationRef: row.hcmValidationRef,
      hcmCommitRef: row.hcmCommitRef,
      correlationId: row.correlationId,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
export { TimeOffController };
