import { correlationMiddleware } from './correlation.middleware';

describe('correlationMiddleware', () => {
  it('sets correlation from header and echoes on response', () => {
    const req = { headers: { 'x-correlation-id': 'abc-123' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    correlationMiddleware(req, res, next);

    expect(req.correlationId).toBe('abc-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'abc-123');
    expect(next).toHaveBeenCalled();
  });

  it('generates uuid when header absent', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    correlationMiddleware(req, res, next);

    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(next).toHaveBeenCalled();
  });
});
