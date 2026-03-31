import { fromNano } from '@ton/core';

/**
 * Format nanotons to human-readable TON amount
 */
export function formatTon(nanotons: string | bigint, decimals: number = 4): string {
  if (BigInt(nanotons) === 0n) return '0';
  
  const ton = fromNano(nanotons);
  const [intPart, decPart] = ton.split('.');
  
  const isNegative = ton.startsWith('-');
  const absInt = isNegative ? intPart.replace('-', '') : intPart;
  const formattedInt = new Intl.NumberFormat('en-US').format(BigInt(absInt));
  const sign = isNegative ? '-' : '';
  
  if (!decPart) return `${sign}${formattedInt}`;
  
  const truncatedDec = decPart.slice(0, decimals).replace(/0+$/, '');
  
  if (!truncatedDec) {
    if (BigInt(absInt) === 0n) {
       return `${sign}< 0.${'0'.repeat(decimals - 1)}1`;
    }
    return `${sign}${formattedInt}`;
  }
  
  return `${sign}${formattedInt}.${truncatedDec}`;
}

/**
 * Truncate address for display: 0QAs...42eP
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format timestamp to locale string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Validate TON address format
 */
export function isValidTonAddress(address: string): boolean {
  // Raw address format: 0:hex (66 chars)
  if (/^-?[0-9]:[a-fA-F0-9]{64}$/.test(address)) return true;
  // User-friendly format: base64url 48 chars
  if (/^[A-Za-z0-9_-]{48}$/.test(address)) return true;
  return false;
}

/**
 * Check if address is testnet (non-bounceable starts with 0Q for testnet)
 * This is a heuristic - user-friendly testnet addresses start with 0Q or kQ (testnet flag)
 */
export function isTestnetAddress(address: string): boolean {
  // Raw address - can be both
  if (address.includes(':')) return true; // raw addresses are network-agnostic
  // User-friendly: check testnet flag byte
  // Testnet non-bounceable: 0Q
  // Testnet bounceable: kQ
  // Mainnet non-bounceable: UQ
  // Mainnet bounceable: EQ
  if (address.startsWith('0Q') || address.startsWith('kQ')) return true;
  // Raw format - assume testnet ok
  if (address.startsWith('0:') || address.startsWith('-1:')) return true;
  return false;
}

/**
 * Parse TON amount from user input, returns nanotons as string
 */
export function parseTonAmount(input: string): { valid: boolean; nanotons?: bigint; error?: string } {
  const cleaned = input.trim().replace(',', '.');
  
  if (!cleaned) {
    return { valid: false, error: 'Введите сумму' };
  }

  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) {
    return { valid: false, error: 'Некорректная сумма' };
  }

  if (num === 0) {
    return { valid: false, error: 'Сумма должна быть больше 0' };
  }

  // Check decimal places (max 9 for nanotons)
  const parts = cleaned.split('.');
  if (parts.length > 1 && parts[1].length > 9) {
    return { valid: false, error: 'Максимум 9 знаков после запятой' };
  }

  try {
    // Convert to nanotons: multiply by 10^9
    const [intPart, decPart = ''] = cleaned.split('.');
    const paddedDec = decPart.padEnd(9, '0').slice(0, 9);
    const nanotons = BigInt(intPart) * BigInt(1_000_000_000) + BigInt(paddedDec);
    return { valid: true, nanotons };
  } catch {
    return { valid: false, error: 'Некорректная сумма' };
  }
}
