import { describe, it, expect } from 'vitest';
import { formatTon, truncateAddress, formatDate, isValidTonAddress, isTestnetAddress, parseTonAmount } from '../src/utils/format';

describe('formatTon', () => {
  it('formats zero', () => {
    expect(formatTon('0')).toBe('0');
    expect(formatTon(BigInt(0))).toBe('0');
  });

  it('formats whole numbers', () => {
    expect(formatTon('1000000000')).toBe('1'); // 1 TON
    expect(formatTon('5000000000')).toBe('5'); // 5 TON
  });

  it('formats decimals', () => {
    expect(formatTon('1500000000')).toBe('1.5'); // 1.5 TON
    expect(formatTon('100000000')).toBe('0.1'); // 0.1 TON
  });

  it('formats very small amounts', () => {
    expect(formatTon('100')).toBe('< 0.0001');
  });

  it('truncates decimals instead of rounding up (anti-bug regression)', () => {
    // 1.999999999 TON — must NEVER show as '2' (would cause insufficient funds)
    expect(formatTon('1999999999')).toBe('1.9999');
    // 2.005 TON — must show 2.005, not 2.01
    expect(formatTon('2005000000')).toBe('2.005');
  });

  it('handles negative amounts', () => {
    expect(formatTon('-1500000000')).toBe('-1.5');
  });

  it('respects custom decimal count', () => {
    expect(formatTon('1999999999', 2)).toBe('1.99'); // Not 2.00
    expect(formatTon('1999999999', 9)).toBe('1.999999999');
  });
});

describe('truncateAddress', () => {
  it('truncates long addresses', () => {
    const addr = '0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO';
    const result = truncateAddress(addr);
    expect(result).toBe('0QAs9V...4-QO');
  });

  it('returns short addresses as-is', () => {
    expect(truncateAddress('short')).toBe('short');
  });

  it('supports custom lengths', () => {
    const addr = '0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO';
    expect(truncateAddress(addr, 8, 6)).toBe('0QAs9VlT...Qi4-QO');
  });
});

describe('formatDate', () => {
  it('formats recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatDate(now)).toBe('Только что');
    expect(formatDate(now - 120)).toMatch(/мин назад/);
    expect(formatDate(now - 7200)).toMatch(/ч назад/);
    expect(formatDate(now - 172800)).toMatch(/дн назад/);
  });
});

describe('isValidTonAddress', () => {
  it('validates user-friendly addresses', () => {
    expect(isValidTonAddress('0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO')).toBe(true);
    expect(isValidTonAddress('kQAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi47nL')).toBe(true);
    expect(isValidTonAddress('EQDjVXa_oltdBP64Nc__p397xLCvGm2IcZ1ba7anSW0NAkeP')).toBe(true);
  });

  it('validates raw addresses', () => {
    expect(isValidTonAddress('0:2cf55953e92efbeadab7ba725c3f93a0b23f842cbba72d7b8e6f510a70e422e3')).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(isValidTonAddress('')).toBe(false);
    expect(isValidTonAddress('hello')).toBe(false);
    expect(isValidTonAddress('0x1234567890abcdef')).toBe(false);
  });
});

describe('isTestnetAddress', () => {
  it('identifies testnet addresses', () => {
    expect(isTestnetAddress('0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO')).toBe(true);
    expect(isTestnetAddress('kQAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi47nL')).toBe(true);
  });

  it('raw addresses are network-agnostic', () => {
    expect(isTestnetAddress('0:2cf55953e92efbeadab7ba725c3f93a0b23f842cbba72d7b8e6f510a70e422e3')).toBe(true);
  });

  it('identifies mainnet addresses', () => {
    expect(isTestnetAddress('EQDjVXa_oltdBP64Nc__p397xLCvGm2IcZ1ba7anSW0NAkeP')).toBe(false);
    expect(isTestnetAddress('UQAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4BRS')).toBe(false);
  });
});

describe('parseTonAmount', () => {
  it('parses valid amounts', () => {
    const result = parseTonAmount('1.5');
    expect(result.valid).toBe(true);
    expect(result.nanotons).toBe(BigInt(1500000000));
  });

  it('parses whole numbers', () => {
    const result = parseTonAmount('10');
    expect(result.valid).toBe(true);
    expect(result.nanotons).toBe(BigInt(10000000000));
  });

  it('rejects zero', () => {
    const result = parseTonAmount('0');
    expect(result.valid).toBe(false);
  });

  it('rejects empty', () => {
    expect(parseTonAmount('').valid).toBe(false);
  });

  it('rejects too many decimals', () => {
    const result = parseTonAmount('1.1234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('9 знаков');
  });

  it('handles comma separator', () => {
    const result = parseTonAmount('1,5');
    expect(result.valid).toBe(true);
    expect(result.nanotons).toBe(BigInt(1500000000));
  });
});
