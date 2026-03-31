import { mnemonicNew, mnemonicToPrivateKey, mnemonicValidate, KeyPair } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import { Address, internal, toNano, SendMode } from '@ton/core';
import { getTonClient, getApiV3Url } from './tonClient';
import { WalletData, Transaction } from '../types';

/** Portable Uint8Array → hex string (no Node.js Buffer needed) */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Simple delay helper for rate-limit spacing */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a new wallet — generate mnemonic, derive keypair, get address
 */
export async function createWallet(): Promise<WalletData & { keyPair: KeyPair }> {
  const mnemonic = await mnemonicNew(24);
  const keyPair = await mnemonicToPrivateKey(mnemonic);

  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  const address = wallet.address.toString({ testOnly: true, bounceable: false });

  return {
    address,
    publicKey: toHex(keyPair.publicKey),
    mnemonic,
    keyPair,
  };
}

/**
 * Import wallet from mnemonic phrase
 */
export async function importWallet(mnemonicWords: string[]): Promise<WalletData & { keyPair: KeyPair }> {
  const cleaned = mnemonicWords.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0);

  if (cleaned.length !== 24) {
    throw new Error('Фраза должна содержать ровно 24 слова');
  }

  const isValid = await mnemonicValidate(cleaned);
  if (!isValid) {
    throw new Error('Мнемоническая фраза невалидна. Проверьте правильность слов');
  }

  const keyPair = await mnemonicToPrivateKey(cleaned);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  const address = wallet.address.toString({ testOnly: true, bounceable: false });

  return {
    address,
    publicKey: toHex(keyPair.publicKey),
    mnemonic: cleaned,
    keyPair,
  };
}

/**
 * Restore wallet contract from mnemonic (for sending transactions)
 */
export async function getWalletContract(mnemonic: string[]) {
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  const client = getTonClient();
  const contract = client.open(wallet);
  return { contract, keyPair, wallet };
}

/**
 * Get wallet balance in nanotons
 */
export async function getBalance(address: string): Promise<bigint> {
  const client = getTonClient();
  const addr = Address.parse(address);
  return client.getBalance(addr);
}

/**
 * Format raw API Hex addresses into standard Base64url friendly addresses (Testnet)
 */
function toFriendlyAddress(addrStr: string): string {
  try {
    if (!addrStr || addrStr === 'Unknown') return addrStr;
    const addr = Address.parse(addrStr);
    return addr.toString({ testOnly: true, bounceable: false });
  } catch {
    return addrStr;
  }
}

/**
 * Get transaction history via TON Center API v3
 */
export async function getTransactions(address: string, limit = 20, offset = 0): Promise<Transaction[]> {
  const apiUrl = getApiV3Url();
  const url = `${apiUrl}/transactions?account=${encodeURIComponent(address)}&limit=${limit}&offset=${offset}&sort=desc`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 400 || response.status === 404 || response.status === 500) {
         return [];
    }
    if (response.status === 429) {
      throw new Error('Rate limit — повторная попытка');
    }
    throw new Error('Не удалось загрузить историю транзакций');
  }

  const data = await response.json();
  const transactions: Transaction[] = [];

  for (const tx of data.transactions || []) {
    try {
      const inMsg = tx.in_msg;
      const outMsgs = tx.out_msgs || [];

      // Incoming transaction
      if (inMsg && inMsg.source && inMsg.value) {
        transactions.push({
          hash: tx.hash,
          lt: tx.lt,
          timestamp: tx.now,
          from: toFriendlyAddress(inMsg.source || 'Unknown'),
          to: toFriendlyAddress(inMsg.destination || address),
          amount: inMsg.value || '0',
          fee: tx.total_fees || '0',
          comment: tryDecodeComment(inMsg.message_content),
          type: 'in',
        });
      }

      // Outgoing transactions
      for (const outMsg of outMsgs) {
        if (outMsg.destination && outMsg.value) {
          transactions.push({
            hash: tx.hash,
            lt: tx.lt,
            timestamp: tx.now,
            from: toFriendlyAddress(address),
            to: toFriendlyAddress(outMsg.destination),
            amount: outMsg.value || '0',
            fee: tx.total_fees || '0',
            comment: tryDecodeComment(outMsg.message_content),
            type: 'out',
          });
        }
      }

      // If no in/out msgs but transaction exists, add as system tx
      if (!inMsg?.source && outMsgs.length === 0) {
        transactions.push({
          hash: tx.hash,
          lt: tx.lt,
          timestamp: tx.now,
          from: '',
          to: toFriendlyAddress(address),
          amount: '0',
          fee: tx.total_fees || '0',
          comment: '',
          type: 'in',
        });
      }
    } catch {
      // Skip malformed transactions
    }
  }

  return transactions;
}

/**
 * Try to decode a text comment from message content
 */
function tryDecodeComment(messageContent: any): string {
  try {
    if (!messageContent) return '';
    if (messageContent.decoded?.type === 'text_comment') {
      return messageContent.decoded.comment || '';
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Send TON to an address
 */
export async function sendTon(
  mnemonic: string[],
  recipientAddress: string,
  amountNano: bigint,
  comment?: string,
  isMax: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { contract, keyPair } = await getWalletContract(mnemonic);

      const client = getTonClient();
      const walletAddress = contract.address;
      const state = await client.getContractState(walletAddress);

      // Delay to respect TonCenter rate-limit (1 req/sec without API key)
      await delay(1500);

      let seqno = 0;
      if (state.state === 'active') {
        seqno = await contract.getSeqno();
      }

      await delay(1500);

      const recipientAddr = Address.parse(recipientAddress);

      await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: isMax ? SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.IGNORE_ERRORS : SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [
          internal({
            value: amountNano,
            to: recipientAddr,
            body: comment || undefined,
            bounce: false,
          }),
        ],
      });

      return { success: true };
    } catch (err: any) {
      const message = err?.message || '';

      // Retry on 429 rate-limit
      if (message.includes('429') && attempt < MAX_RETRIES) {
        await delay(3000 * attempt); // Progressive backoff: 3s, 6s
        continue;
      }

      if (message.includes('timeout') || message.includes('TIMEOUT')) {
        return {
          success: false,
          error: 'Сеть не ответила. Транзакция могла быть отправлена — проверьте баланс через минуту',
        };
      }

      return {
        success: false,
        error: `Ошибка отправки: ${message}`,
      };
    }
  }

  return { success: false, error: 'Не удалось отправить после нескольких попыток. Попробуйте через минуту' };
}

/**
 * Check if an address is initialized (has contract deployed)
 */
export async function isAddressInitialized(address: string): Promise<boolean> {
  try {
    const client = getTonClient();
    const addr = Address.parse(address);
    const state = await client.getContractState(addr);
    return state.state === 'active';
  } catch {
    return false;
  }
}

/**
 * Get address balance to check activity
 */
export async function getAddressBalance(address: string): Promise<bigint> {
  try {
    return await getBalance(address);
  } catch {
    return BigInt(0);
  }
}
