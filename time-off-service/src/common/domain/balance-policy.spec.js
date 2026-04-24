import {
  assertPositiveDimensions,
  canReserve,
  detectDrift,
  effectiveAvailable,
} from './balance-policy';

describe('balance-policy', () => {
  describe('effectiveAvailable', () => {
    it('subtracts reserved from available', () => {
      expect(effectiveAvailable(10, 3)).toBe(7);
    });

    it('rounds to three decimals', () => {
      expect(effectiveAvailable(10.3333, 1.1111)).toBe(9.222);
    });
  });

  describe('canReserve', () => {
    it('allows when effective equals requested', () => {
      expect(canReserve(2, 2)).toBe(true);
    });

    it('rejects when below requested', () => {
      expect(canReserve(1.9, 2)).toBe(false);
    });
  });

  describe('detectDrift', () => {
    it('true when HCM available is less than local reservations', () => {
      expect(detectDrift(1, 2)).toBe(true);
    });

    it('false when HCM covers reservations', () => {
      expect(detectDrift(5, 5)).toBe(false);
    });
  });

  describe('assertPositiveDimensions', () => {
    it('throws when employeeId missing', () => {
      expect(() => assertPositiveDimensions('', 'loc', 1)).toThrow('employeeId');
    });

    it('throws when locationId not a string', () => {
      expect(() => assertPositiveDimensions('e', null, 1)).toThrow('locationId');
    });

    it('throws when days not positive', () => {
      expect(() => assertPositiveDimensions('e', 'loc', 0)).toThrow('days');
    });
  });
});
