import { randomUUID } from 'crypto';

export function correlationMiddleware(req, res, next) {
  const incoming = req.headers['x-correlation-id'];
  req.correlationId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}
