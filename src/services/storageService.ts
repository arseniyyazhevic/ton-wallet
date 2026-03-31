import { StoredWallet } from '../types';

const WALLET_STORAGE_KEY = 'ton_wallet_data';
const TRUSTED_ADDRESSES_KEY = 'ton_trusted_addresses';
const USED_ADDRESSES_KEY = 'ton_used_addresses';
const PIN_ATTEMPTS_KEY = 'ton_pin_attempts';

/**
 * Derive an AES-GCM key from a PIN using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    pinKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt mnemonic and store wallet data
 */
export async function encryptAndStore(
  mnemonic: string[],
  pin: string,
  address: string,
  publicKey: string
): Promise<void> {
  if (!crypto.subtle) {
    throw new Error('Ваш браузер не поддерживает шифрование. Используйте Chrome, Firefox или Safari');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);

  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(mnemonic.join(' '))
  );

  const storedWallet: StoredWallet = {
    encryptedMnemonic: arrayToBase64(new Uint8Array(encrypted)),
    iv: arrayToBase64(iv),
    salt: arrayToBase64(salt),
    address,
    publicKey,
  };

  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(storedWallet));
  } catch {
    throw new Error('Не удалось сохранить данные. Очистите хранилище браузера');
  }

  // Reset PIN attempts on successful storage
  localStorage.removeItem(PIN_ATTEMPTS_KEY);
}

/**
 * Decrypt and load mnemonic from storage
 */
export async function decryptAndLoad(pin: string): Promise<{ mnemonic: string[]; address: string; publicKey: string }> {
  const stored = getStoredWallet();
  if (!stored) {
    throw new Error('Кошелёк не найден. Создайте новый или импортируйте');
  }

  // Check PIN attempts lockout
  const attempts = getPinAttempts();
  if (attempts.locked) {
    const remainingSeconds = Math.ceil((attempts.lockUntil! - Date.now()) / 1000);
    throw new Error(`Слишком много попыток. Подождите ${remainingSeconds} секунд`);
  }

  const salt = base64ToArray(stored.salt);
  const iv = base64ToArray(stored.iv);
  const encryptedData = base64ToArray(stored.encryptedMnemonic);

  try {
    const key = await deriveKey(pin, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    const mnemonicStr = decoder.decode(decrypted);

    // Reset attempts on success
    localStorage.removeItem(PIN_ATTEMPTS_KEY);

    return {
      mnemonic: mnemonicStr.split(' '),
      address: stored.address,
      publicKey: stored.publicKey,
    };
  } catch {
    // Increment failed attempts
    incrementPinAttempts();
    throw new Error('Неверный PIN-код');
  }
}

/**
 * Check if there's a stored wallet
 */
export function hasStoredWallet(): boolean {
  return localStorage.getItem(WALLET_STORAGE_KEY) !== null;
}

/**
 * Get stored wallet metadata (address) without decrypting
 */
export function getStoredWallet(): StoredWallet | null {
  const data = localStorage.getItem(WALLET_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as StoredWallet;
  } catch {
    return null;
  }
}

/**
 * Clear all wallet data
 */
export function clearWallet(): void {
  localStorage.removeItem(WALLET_STORAGE_KEY);
  localStorage.removeItem(TRUSTED_ADDRESSES_KEY);
  localStorage.removeItem(USED_ADDRESSES_KEY);
  localStorage.removeItem(PIN_ATTEMPTS_KEY);
}

// --- Trusted addresses ---

export function getTrustedAddresses(): { address: string; label: string }[] {
  try {
    const data = localStorage.getItem(TRUSTED_ADDRESSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addTrustedAddress(address: string, label: string): void {
  const trusted = getTrustedAddresses();
  if (!trusted.find((t) => t.address === address)) {
    trusted.push({ address, label });
    localStorage.setItem(TRUSTED_ADDRESSES_KEY, JSON.stringify(trusted));
  }
}

export function removeTrustedAddress(address: string): void {
  const trusted = getTrustedAddresses().filter((t) => t.address !== address);
  localStorage.setItem(TRUSTED_ADDRESSES_KEY, JSON.stringify(trusted));
}

export function isTrustedAddress(address: string): boolean {
  return getTrustedAddresses().some((t) => t.address === address);
}

// --- Used addresses history ---

export function getUsedAddresses(): string[] {
  try {
    const data = localStorage.getItem(USED_ADDRESSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addUsedAddress(address: string): void {
  const used = getUsedAddresses();
  if (!used.includes(address)) {
    used.push(address);
    localStorage.setItem(USED_ADDRESSES_KEY, JSON.stringify(used));
  }
}

// --- PIN attempts tracking ---

interface PinAttemptsData {
  count: number;
  lockUntil: number | null;
}

function getPinAttempts(): { locked: boolean; count: number; lockUntil?: number } {
  try {
    const data = localStorage.getItem(PIN_ATTEMPTS_KEY);
    if (!data) return { locked: false, count: 0 };
    const parsed: PinAttemptsData = JSON.parse(data);
    if (parsed.lockUntil && Date.now() < parsed.lockUntil) {
      return { locked: true, count: parsed.count, lockUntil: parsed.lockUntil };
    }
    if (parsed.lockUntil && Date.now() >= parsed.lockUntil) {
      localStorage.removeItem(PIN_ATTEMPTS_KEY);
      return { locked: false, count: 0 };
    }
    return { locked: false, count: parsed.count };
  } catch {
    return { locked: false, count: 0 };
  }
}

function incrementPinAttempts(): void {
  const current = getPinAttempts();
  const newCount = current.count + 1;
  const data: PinAttemptsData = {
    count: newCount,
    lockUntil: newCount >= 5 ? Date.now() + 60000 : null, // 60 sec lockout after 5 attempts
  };
  localStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify(data));
}

// --- Helpers ---

function arrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}
