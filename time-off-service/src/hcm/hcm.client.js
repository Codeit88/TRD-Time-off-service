import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Thin HTTP adapter to the HCM "source of truth" APIs.
 * Paths match the mock server under test/support; production Workday/SAP would map here.
 */
@Injectable()
class HcmClient {
  constructor(
    @Inject(HttpService)
    http,
    @Inject(ConfigService)
    config,
  ) {
    this.http = http;
    this.config = config;
    this.log = new Logger(HcmClient.name);
  }

  get baseUrl() {
    return (
      this.config.get('HCM_BASE_URL') ||
      this.config.get('hcm.baseUrl') ||
      ''
    );
  }

  async validateReservation({ employeeId, locationId, days }) {
    const url = `${this.baseUrl.replace(/\/$/, '')}/hcm/v1/time-off/validate`;
    try {
      const res = await firstValueFrom(
        this.http.post(url, { employeeId, locationId, days }, { timeout: 10_000 }),
      );
      return {
        ok: !!res.data?.ok,
        ref: res.data?.ref ?? null,
        error: res.data?.error ?? null,
        rawStatus: res.status,
      };
    } catch (e) {
      this.log.warn(`HCM validate failed: ${e.message}`);
      return {
        ok: false,
        ref: null,
        error: e.response?.data?.error || e.message || 'hcm_unreachable',
        rawStatus: e.response?.status ?? 0,
      };
    }
  }

  async commitTimeOff({ requestId, employeeId, locationId, days }) {
    const url = `${this.baseUrl.replace(/\/$/, '')}/hcm/v1/time-off/commit`;
    try {
      const res = await firstValueFrom(
        this.http.post(
          url,
          { requestId, employeeId, locationId, days },
          { timeout: 10_000 },
        ),
      );
      return {
        ok: !!res.data?.ok,
        ref: res.data?.ref ?? null,
        error: res.data?.error ?? null,
        rawStatus: res.status,
      };
    } catch (e) {
      this.log.warn(`HCM commit failed: ${e.message}`);
      return {
        ok: false,
        ref: null,
        error: e.response?.data?.error || e.message || 'hcm_unreachable',
        rawStatus: e.response?.status ?? 0,
      };
    }
  }
}
export { HcmClient };
