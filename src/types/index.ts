// Types for the TON Wallet application

export interface WalletData {
  address: string;
  publicKey: string;
  mnemonic: string[];
}

export interface StoredWallet {
  encryptedMnemonic: string;
  iv: string;
  salt: string;
  address: string;
  publicKey: string;
}

export interface Transaction {
  hash: string;
  lt: string;
  timestamp: number;
  from: string;
  to: string;
  amount: string; // in nanotons
  fee: string;
  comment: string;
  type: 'in' | 'out';
}

export interface SendFormData {
  recipientAddress: string;
  amount: string;
  comment: string;
}

export interface AddressWarning {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

export interface TrustedAddress {
  address: string;
  label: string;
  addedAt: number;
}

export type Screen = 
  | 'welcome'
  | 'create'
  | 'import'
  | 'pin-setup'
  | 'pin-entry'
  | 'dashboard'
  | 'receive'
  | 'send'
  | 'settings';
