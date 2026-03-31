import { AddressWarning } from '../types';
import { getUsedAddresses, isTrustedAddress } from './storageService';
import { isAddressInitialized, getAddressBalance } from './walletService';
import { isValidTonAddress, isTestnetAddress } from '../utils/format';

/**
 * Run all address safety checks and return list of warnings
 */
export async function checkAddress(
  recipientAddress: string,
  senderAddress: string,
  amountNano: bigint,
  balanceNano: bigint
): Promise<AddressWarning[]> {
  const warnings: AddressWarning[] = [];

  // 1. Basic validation
  if (!isValidTonAddress(recipientAddress)) {
    warnings.push({
      level: 'critical',
      title: 'Неверный адрес',
      message: 'Неверный формат TON-адреса',
    });
    return warnings; // No point checking further
  }

  // 2. Check testnet vs mainnet
  if (!isTestnetAddress(recipientAddress)) {
    warnings.push({
      level: 'critical',
      title: 'Адрес mainnet',
      message: 'Это адрес mainnet. Приложение работает в testnet. Средства будут потеряны!',
    });
    return warnings;
  }

  // 3. Sending to self
  if (recipientAddress === senderAddress) {
    warnings.push({
      level: 'warning',
      title: 'Отправка себе',
      message: 'Вы отправляете TON на свой собственный адрес',
    });
  }

  // 4. Trusted address check - skip further checks if trusted
  if (isTrustedAddress(recipientAddress)) {
    return warnings;
  }

  // 5. Address poisoning detection (similar address check)
  const poisoningWarning = checkAddressPoisoning(recipientAddress);
  if (poisoningWarning) {
    warnings.push(poisoningWarning);
  }

  // 6. New address warning
  const usedAddresses = getUsedAddresses();
  if (!usedAddresses.includes(recipientAddress)) {
    warnings.push({
      level: 'warning',
      title: 'Новый адрес',
      message: 'Вы впервые отправляете на этот адрес. Убедитесь, что адрес правильный',
    });
  }

  // 7. Large amount warning (> 50% of balance)
  if (balanceNano > BigInt(0) && amountNano > balanceNano / BigInt(2)) {
    warnings.push({
      level: 'warning',
      title: 'Крупная сумма',
      message: 'Вы отправляете более половины вашего баланса. Подтвердите отправку',
    });
  }

  // 8. Full balance warning (might fail due to fees)
  if (amountNano >= balanceNano) {
    warnings.push({
      level: 'warning',
      title: 'Весь баланс',
      message: 'Весь баланс будет отправлен. С учётом комиссии реальная сумма может быть меньше',
    });
  }

  // 9. Async checks - address initialization and balance
  try {
    const [isInitialized, recipientBalance] = await Promise.all([
      isAddressInitialized(recipientAddress),
      getAddressBalance(recipientAddress),
    ]);

    if (!isInitialized) {
      warnings.push({
        level: 'warning',
        title: 'Неактивный адрес',
        message: 'Адрес получателя не активирован. Если адрес в bounceable-формате, средства могут вернуться',
      });
    }

    if (recipientBalance === BigInt(0) && isInitialized === false) {
      warnings.push({
        level: 'warning',
        title: 'Нулевой баланс',
        message: 'На адресе получателя нет транзакций. Убедитесь, что адрес верный',
      });
    }
  } catch {
    // Network error during checks — add info warning but don't block
    warnings.push({
      level: 'info',
      title: 'Проверка недоступна',
      message: 'Не удалось проверить статус адреса получателя. Продолжайте с осторожностью',
    });
  }

  return warnings;
}

/**
 * Check for address poisoning attack
 * Compares first 4 and last 4 characters of the address with used addresses
 */
export function checkAddressPoisoning(address: string): AddressWarning | null {
  const usedAddresses = getUsedAddresses();
  const prefix = address.slice(0, 4);
  const suffix = address.slice(-4);

  for (const used of usedAddresses) {
    if (used === address) continue; // Same address is ok
    
    const usedPrefix = used.slice(0, 4);
    const usedSuffix = used.slice(-4);

    // If prefix AND suffix match but full address differs — likely poisoning
    if (prefix === usedPrefix && suffix === usedSuffix) {
      return {
        level: 'critical',
        title: '⚠️ Подозрение на подмену адреса!',
        message: `Этот адрес похож на ранее использованный (${used.slice(0, 8)}...${used.slice(-6)}), но отличается! Возможна атака address poisoning. Сравните адреса полностью!`,
      };
    }

    // If only prefix or suffix matches — mild similarity warning
    if ((prefix === usedPrefix || suffix === usedSuffix) && address.length === used.length) {
      // Only warn if a lot of chars match (e.g., first 6 same)
      if (address.slice(0, 6) === used.slice(0, 6) || address.slice(-6) === used.slice(-6)) {
        return {
          level: 'warning',
          title: 'Похожий адрес',
          message: `Этот адрес похож на ранее использованный. Убедитесь, что это верный адрес`,
        };
      }
    }
  }

  return null;
}

/**
 * Check clipboard tampering — compare pasted text with current clipboard
 * Returns warning if different
 */
export async function checkClipboardTampering(pastedValue: string): Promise<AddressWarning | null> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return null; // Clipboard API not available
    }

    const clipboardContent = await navigator.clipboard.readText();
    const cleanedPasted = pastedValue.trim();
    const cleanedClipboard = clipboardContent.trim();

    if (cleanedPasted !== cleanedClipboard && cleanedClipboard.length > 0 && cleanedPasted.length > 0) {
      return {
        level: 'critical',
        title: '⚠️ Буфер обмена изменён!',
        message: 'Адрес в буфере обмена отличается от вставленного! Возможно, вредоносное ПО подменило адрес. Проверьте адрес вручную!',
      };
    }
  } catch {
    // Clipboard read failed — permission denied, ignore
  }

  return null;
}
