import { Controller, Get } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get()
  ping() {
    return { status: 'ok', service: 'time-off' };
  }
}
export { HealthController };
