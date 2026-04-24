import { ValidationPipe } from '@nestjs/common';
import { correlationMiddleware } from '../src/common/correlation.middleware';

export function applyProductionLikeMiddleware(app) {
  app.use(correlationMiddleware);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
}
