/**
 * Pure helpers for balance math and defensive checks (easy to unit test, no DB).
 */

export function effectiveAvailable(availableDays, reservedDays) {
  const a = Number(availableDays);
  const r = Number(reservedDays);
  return Math.round((a - r) * 1000) / 1000;
}

export function canReserve(effectiveAvail, requestedDays) {
  return effectiveAvail + 1e-9 >= requestedDays;
}

/**
 * After HCM batch refresh: detect if local holds exceed what HCM says is available.
 */
export function detectDrift(hcmAvailable, reservedDays) {
  return hcmAvailable + 1e-9 < reservedDays;
}

export function assertPositiveDimensions(employeeId, locationId, days) {
  if (!employeeId || typeof employeeId !== 'string') {
    throw new Error('employeeId required');
  }
  if (!locationId || typeof locationId !== 'string') {
    throw new Error('locationId required');
  }
  if (days == null || Number(days) <= 0) {
    throw new Error('days must be positive');
  }
}
