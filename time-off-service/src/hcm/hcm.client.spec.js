import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { HcmClient } from './hcm.client';

describe('HcmClient', () => {
  let client;
  let http;
  let config;

  beforeEach(async () => {
    http = { post: jest.fn() };
    config = { get: jest.fn().mockReturnValue('http://hcm.test') };

    const mod = await Test.createTestingModule({
      providers: [
        HcmClient,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    client = mod.get(HcmClient);
  });

  it('validateReservation maps ok response', async () => {
    http.post.mockReturnValue(
      of({ status: 200, data: { ok: true, ref: 'r1' } }),
    );

    const out = await client.validateReservation({
      employeeId: 'e',
      locationId: 'l',
      days: 1,
    });

    expect(out.ok).toBe(true);
    expect(out.ref).toBe('r1');
    expect(http.post).toHaveBeenCalledWith(
      'http://hcm.test/hcm/v1/time-off/validate',
      { employeeId: 'e', locationId: 'l', days: 1 },
      { timeout: 10_000 },
    );
  });

  it('validateReservation maps axios error to ok false', async () => {
    http.post.mockReturnValue(
      throwError(() => ({
        message: 'Network Error',
        response: { status: 503, data: { error: 'busy' } },
      })),
    );

    const out = await client.validateReservation({
      employeeId: 'e',
      locationId: 'l',
      days: 1,
    });

    expect(out.ok).toBe(false);
    expect(out.error).toBe('busy');
  });

  it('commitTimeOff maps success', async () => {
    http.post.mockReturnValue(
      of({ status: 200, data: { ok: true, ref: 'c1' } }),
    );

    const out = await client.commitTimeOff({
      requestId: 'rid',
      employeeId: 'e',
      locationId: 'l',
      days: 2,
    });

    expect(out.ok).toBe(true);
    expect(out.ref).toBe('c1');
  });
});
