import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since storageService uses browser APIs (crypto.subtle, localStorage),
// we test the pure logic of encoding/decoding helpers and storage key management

describe('storageService', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
  });

  describe('trusted addresses', () => {
    it('returns empty array when no trusted addresses', async () => {
      const { getTrustedAddresses } = await import('../src/services/storageService');
      expect(getTrustedAddresses()).toEqual([]);
    });

    it('adds and retrieves trusted address', async () => {
      const { addTrustedAddress, getTrustedAddresses } = await import('../src/services/storageService');
      addTrustedAddress('0QTest123', 'My Exchange');
      const trusted = getTrustedAddresses();
      expect(trusted).toHaveLength(1);
      expect(trusted[0].address).toBe('0QTest123');
      expect(trusted[0].label).toBe('My Exchange');
    });

    it('does not add duplicate addresses', async () => {
      const { addTrustedAddress, getTrustedAddresses } = await import('../src/services/storageService');
      addTrustedAddress('0QTest123', 'My Exchange');
      addTrustedAddress('0QTest123', 'My Exchange Again');
      expect(getTrustedAddresses()).toHaveLength(1);
    });

    it('removes trusted address', async () => {
      const { addTrustedAddress, removeTrustedAddress, getTrustedAddresses } = await import('../src/services/storageService');
      addTrustedAddress('0QTest123', 'My Exchange');
      addTrustedAddress('0QTest456', 'My Wallet');
      removeTrustedAddress('0QTest123');
      const trusted = getTrustedAddresses();
      expect(trusted).toHaveLength(1);
      expect(trusted[0].address).toBe('0QTest456');
    });

    it('checks if address is trusted', async () => {
      const { addTrustedAddress, isTrustedAddress } = await import('../src/services/storageService');
      addTrustedAddress('0QTest123', 'My Exchange');
      expect(isTrustedAddress('0QTest123')).toBe(true);
      expect(isTrustedAddress('0QOther')).toBe(false);
    });
  });

  describe('used addresses', () => {
    it('returns empty array initially', async () => {
      const { getUsedAddresses } = await import('../src/services/storageService');
      expect(getUsedAddresses()).toEqual([]);
    });

    it('adds and retrieves used addresses', async () => {
      const { addUsedAddress, getUsedAddresses } = await import('../src/services/storageService');
      addUsedAddress('0QAddr1');
      addUsedAddress('0QAddr2');
      const used = getUsedAddresses();
      expect(used).toContain('0QAddr1');
      expect(used).toContain('0QAddr2');
    });

    it('does not add duplicates', async () => {
      const { addUsedAddress, getUsedAddresses } = await import('../src/services/storageService');
      addUsedAddress('0QAddr1');
      addUsedAddress('0QAddr1');
      expect(getUsedAddresses()).toHaveLength(1);
    });
  });

  describe('wallet existence check', () => {
    it('returns false when no wallet stored', async () => {
      const { hasStoredWallet } = await import('../src/services/storageService');
      expect(hasStoredWallet()).toBe(false);
    });
  });
});
