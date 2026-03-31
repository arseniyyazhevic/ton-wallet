import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAddress, checkAddressPoisoning } from '../src/services/addressGuard';

// Mock storageService
vi.mock('../src/services/storageService', () => ({
  getUsedAddresses: vi.fn(() => []),
  isTrustedAddress: vi.fn(() => false),
}));

// Mock walletService
vi.mock('../src/services/walletService', () => ({
  isAddressInitialized: vi.fn(async () => true),
  getAddressBalance: vi.fn(async () => BigInt(1000000000)),
}));

import { getUsedAddresses, isTrustedAddress } from '../src/services/storageService';
import { isAddressInitialized, getAddressBalance } from '../src/services/walletService';

const VALID_TESTNET_ADDR = '0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO';
const VALID_TESTNET_ADDR_2 = '0QBn8nzfBH7CXwS0eYIve94pDkCiZ9MTnBbPjmtB92bVFJn5';
const MAINNET_ADDR = 'EQDjVXa_oltdBP64Nc__p397xLCvGm2IcZ1ba7anSW0NAkeP';

describe('checkAddress — full orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUsedAddresses).mockReturnValue([]);
    vi.mocked(isTrustedAddress).mockReturnValue(false);
    vi.mocked(isAddressInitialized).mockResolvedValue(true);
    vi.mocked(getAddressBalance).mockResolvedValue(BigInt(1000000000));
  });

  it('returns critical warning for invalid address format', async () => {
    const warnings = await checkAddress('not-a-real-addr', VALID_TESTNET_ADDR, 100n, 1000n);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe('critical');
    expect(warnings[0].title).toContain('Неверный адрес');
  });

  it('returns critical warning for mainnet address', async () => {
    const warnings = await checkAddress(MAINNET_ADDR, VALID_TESTNET_ADDR, 100n, 1000n);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe('critical');
    expect(warnings[0].title).toContain('mainnet');
  });

  it('warns when sending to self', async () => {
    const warnings = await checkAddress(VALID_TESTNET_ADDR, VALID_TESTNET_ADDR, 100n, 1000n);
    const selfWarning = warnings.find(w => w.title.includes('Отправка себе'));
    expect(selfWarning).toBeDefined();
  });

  it('skips deep checks for trusted addresses', async () => {
    vi.mocked(isTrustedAddress).mockReturnValue(true);
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, 100n, 200n);
    // Should NOT have "large amount" or "new address" warnings
    expect(warnings.find(w => w.title.includes('Крупная'))).toBeUndefined();
    expect(warnings.find(w => w.title.includes('Новый'))).toBeUndefined();
  });

  it('warns for new (first-time) addresses', async () => {
    vi.mocked(getUsedAddresses).mockReturnValue([]);
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, 100n, 1000n);
    const newAddrWarning = warnings.find(w => w.title.includes('Новый адрес'));
    expect(newAddrWarning).toBeDefined();
  });

  it('does NOT warn for previously used addresses', async () => {
    vi.mocked(getUsedAddresses).mockReturnValue([VALID_TESTNET_ADDR_2]);
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, 100n, 1000n);
    const newAddrWarning = warnings.find(w => w.title.includes('Новый адрес'));
    expect(newAddrWarning).toBeUndefined();
  });

  it('warns when sending > 50% of balance', async () => {
    const balance = BigInt(2_000_000_000); // 2 TON
    const amount = BigInt(1_500_000_000); // 1.5 TON (75%)
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, amount, balance);
    const largeWarning = warnings.find(w => w.title.includes('Крупная'));
    expect(largeWarning).toBeDefined();
  });

  it('warns when sending entire balance', async () => {
    const balance = BigInt(2_000_000_000);
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, balance, balance);
    const fullWarning = warnings.find(w => w.title.includes('Весь баланс'));
    expect(fullWarning).toBeDefined();
  });

  it('warns for uninitialized recipient address', async () => {
    vi.mocked(isAddressInitialized).mockResolvedValue(false);
    vi.mocked(getAddressBalance).mockResolvedValue(BigInt(0));
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, 100n, 1000n);
    const uninitWarning = warnings.find(w => w.title.includes('Неактивный'));
    const zeroWarning = warnings.find(w => w.title.includes('Нулевой'));
    expect(uninitWarning).toBeDefined();
    expect(zeroWarning).toBeDefined();
  });

  it('provides graceful info warning on network error', async () => {
    vi.mocked(isAddressInitialized).mockRejectedValue(new Error('Network error'));
    const warnings = await checkAddress(VALID_TESTNET_ADDR_2, VALID_TESTNET_ADDR, 100n, 1000n);
    const infoWarning = warnings.find(w => w.title.includes('Проверка недоступна'));
    expect(infoWarning).toBeDefined();
    expect(infoWarning!.level).toBe('info');
  });
});

describe('checkAddressPoisoning', () => {
  beforeEach(() => {
    vi.mocked(getUsedAddresses).mockReturnValue([]);
  });

  it('returns null for completely different address', () => {
    vi.mocked(getUsedAddresses).mockReturnValue([
      'kQBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    ]);
    const result = checkAddressPoisoning(VALID_TESTNET_ADDR);
    expect(result).toBeNull();
  });

  it('returns null for exact same address', () => {
    vi.mocked(getUsedAddresses).mockReturnValue([VALID_TESTNET_ADDR]);
    const result = checkAddressPoisoning(VALID_TESTNET_ADDR);
    expect(result).toBeNull();
  });

  it('detects address with matching prefix AND suffix (poisoning)', () => {
    const realAddr = '0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO';
    const fakeAddr = '0QAsXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX4-QO';
    vi.mocked(getUsedAddresses).mockReturnValue([realAddr]);
    const result = checkAddressPoisoning(fakeAddr);
    expect(result).not.toBeNull();
    expect(result!.level).toBe('critical');
  });

  it('returns null when no used addresses exist', () => {
    vi.mocked(getUsedAddresses).mockReturnValue([]);
    const result = checkAddressPoisoning(VALID_TESTNET_ADDR);
    expect(result).toBeNull();
  });

  it('detects partial similarity (first 6 or last 6 chars match)', () => {
    const realAddr = '0QAs9VlT6S776tq3unJcP5Ogsj-ELLunLXuOb1EKcOQi4-QO';
    // Same first 6 chars (0QAs9V), same length (48), but different suffix
    const fakeAddr = '0QAs9VXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    vi.mocked(getUsedAddresses).mockReturnValue([realAddr]);
    const result = checkAddressPoisoning(fakeAddr);
    // Should detect since first 6 chars match
    expect(result).not.toBeNull();
  });
});
