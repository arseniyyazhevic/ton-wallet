import { TonClient } from '@ton/ton';

const TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const TESTNET_API_V3 = 'https://testnet.toncenter.com/api/v3';

let client: TonClient | null = null;

/**
 * Get or create TonClient singleton for testnet
 */
export function getTonClient(): TonClient {
  if (!client) {
    client = new TonClient({
      endpoint: TESTNET_ENDPOINT,
    });
  }
  return client;
}

/**
 * Get the TON Center API v3 base URL for transaction history queries
 */
export function getApiV3Url(): string {
  return TESTNET_API_V3;
}
