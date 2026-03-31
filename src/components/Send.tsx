import React, { useState } from 'react';
import { sendTon, getBalance } from '../services/walletService';
import { Address } from '@ton/core';
import { checkAddress } from '../services/addressGuard';
import { addUsedAddress } from '../services/storageService';
import { isValidTonAddress, parseTonAmount, formatTon } from '../utils/format';
import { AddressWarning } from '../types';
import { WarningModal, ConfirmSendModal } from './WarningModal';
import { showToast } from './Toast';

interface Props {
  address: string;
  mnemonic: string[];
  onBack: () => void;
  onSuccess: () => void;
}

type SendStep = 'form' | 'checking' | 'warnings' | 'confirm' | 'sending' | 'result';

export const Send: React.FC<Props> = ({ address, mnemonic, onBack, onSuccess }) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<SendStep>('form');
  const [warnings, setWarnings] = useState<AddressWarning[]>([]);
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [sendDisabled, setSendDisabled] = useState(false);

  const [isMaxMode, setIsMaxMode] = useState(false);

  // Load balance with retry (TonCenter rate-limits to 1 req/sec without API key)
  React.useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 1) => {
      try {
        const b = await getBalance(address);
        if (!cancelled) {
          setBalance(b);
          setBalanceLoading(false);
        }
      } catch (err) {
        console.warn(`Balance fetch attempt ${attempt} failed`, err);
        if (attempt < 3 && !cancelled) {
          setTimeout(() => load(attempt + 1), 3000); // Wait 3s between retries
        } else if (!cancelled) {
          setBalanceLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [address]);



  const validateForm = (): string | null => {
    if (!recipientAddress.trim()) return 'Введите адрес получателя';
    if (!isValidTonAddress(recipientAddress.trim())) return 'Неверный формат TON-адреса';
    
    try {
      if (Address.parse(recipientAddress.trim()).equals(Address.parse(address))) {
        return 'Вы пытаетесь перевести средства на свой собственный адрес';
      }
    } catch {
       // fallback if parse fails
    }
    
    const parsed = parseTonAmount(amount);
    if (!parsed.valid) return parsed.error!;
    
    if (balance !== null && parsed.nanotons! > balance) {
      return `Недостаточно средств. Баланс: ${formatTon(balance)} TON`;
    }

    return null;
  };

  const handleSend = async () => {
    setError('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const parsed = parseTonAmount(amount);
    if (!parsed.valid) return;

    // Run address security checks
    setStep('checking');
    try {
      const addressWarnings = await checkAddress(
        recipientAddress.trim(),
        address,
        parsed.nanotons!,
        balance ?? BigInt(0)
      );

      if (addressWarnings.length > 0) {
        setWarnings(addressWarnings);
        setStep('warnings');
        return;
      }
    } catch {
      // If checks fail, just show confirm
    }

    setStep('confirm');
  };

  const handleWarningConfirm = () => {
    setStep('confirm');
  };

  const handleWarningCancel = () => {
    setWarnings([]);
    setStep('form');
  };

  const handleConfirmSend = async () => {
    setStep('sending');
    
    const parsed = parseTonAmount(amount);
    if (!parsed.valid) return;

    try {
      const result = await sendTon(mnemonic, recipientAddress.trim(), parsed.nanotons!, comment.trim() || undefined, isMaxMode);
      setTxResult(result);

      if (result.success) {
        addUsedAddress(recipientAddress.trim());
        showToast('Транзакция отправлена!', 'success');
        // Disable send button for 5 seconds to prevent double-send
        setSendDisabled(true);
        setTimeout(() => setSendDisabled(false), 5000);
      }
    } catch (err: any) {
      setTxResult({ success: false, error: err.message || 'Ошибка отправки' });
    }

    setStep('result');
  };

  const handleConfirmCancel = () => {
    setStep('form');
  };

  const handleMax = () => {
    if (balance !== null) {
      if (balance > BigInt(0)) {
        setAmount(formatTon(balance)); // Show same truncated format as balance hint
        setIsMaxMode(true);
      } else {
        showToast('Недостаточно средств', 'error');
      }
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value.replace(/[^0-9.,]/g, ''));
    setIsMaxMode(false);
  };

  // Render step-based UI
  if (step === 'checking') {
    return (
      <div className="screen send-screen">
        <div className="loading-container">
          <div className="spinner" />
          <p>Проверка безопасности адреса...</p>
        </div>
      </div>
    );
  }

  if (step === 'warnings') {
    return (
      <WarningModal
        warnings={warnings}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <ConfirmSendModal
        recipientAddress={recipientAddress.trim()}
        amount={amount}
        comment={comment || undefined}
        onConfirm={handleConfirmSend}
        onCancel={handleConfirmCancel}
      />
    );
  }

  if (step === 'sending') {
    return (
      <div className="screen send-screen">
        <div className="loading-container">
          <div className="spinner" />
          <p>Отправка транзакции...</p>
          <p className="text-muted">Это может занять 5–15 секунд</p>
        </div>
      </div>
    );
  }

  if (step === 'result' && txResult) {
    return (
      <div className="screen send-screen">
        <div className={`result-container ${txResult.success ? 'result-success' : 'result-error'}`}>
          <div className="result-icon">
            {txResult.success ? '✅' : '❌'}
          </div>
          <h3>{txResult.success ? 'Транзакция отправлена!' : 'Ошибка отправки'}</h3>
          {txResult.success ? (
            <p className="text-muted">
              Подтверждение обычно занимает 5–15 секунд. Баланс обновится автоматически.
            </p>
          ) : (
            <p className="error-text">{txResult.error}</p>
          )}
          <button
            className="btn btn-primary btn-large"
            onClick={onSuccess}
            disabled={sendDisabled}
          >
            На главную
          </button>
          {!txResult.success && (
            <button className="btn btn-secondary" onClick={() => { setStep('form'); setTxResult(null); }}>
              Попробовать ещё раз
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default: form
  const hasZeroBalance = balance !== null && balance <= BigInt(0);
  const parsedAmount = parseTonAmount(amount);
  const isAmountTooHigh = !isMaxMode && balance !== null && parsedAmount.valid && parsedAmount.nanotons! > balance;

  return (
    <div className="screen send-screen">
      <h2>Отправить TON</h2>

      {balanceLoading ? (
        <p className="balance-hint">Загрузка баланса...</p>
      ) : balance !== null ? (
        <p className="balance-hint">Баланс: {formatTon(balance)} TON</p>
      ) : (
        <p className="balance-hint" style={{ color: 'var(--error)' }}>Не удалось загрузить баланс</p>
      )}

      {hasZeroBalance && (
        <div className="error-message" style={{ marginBottom: '12px' }}>
          На вашем кошельке нет средств. Получите тестовые TON через{' '}
          <a href="https://t.me/testgiver_ton_bot" target="_blank" rel="noopener noreferrer">@testgiver_ton_bot</a>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Адрес получателя</label>
        <input
          type="text"
          className="input"
          placeholder="0Q... или kQ... (testnet адрес)"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          onPaste={undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={hasZeroBalance}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Сумма (TON)</label>
        <div className="amount-input-wrapper">
          <input
            type="text"
            className="input"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            inputMode="decimal"
            disabled={hasZeroBalance}
          />
          <button className="btn btn-max" onClick={handleMax} disabled={hasZeroBalance}>
            MAX
          </button>
        </div>
        {isAmountTooHigh ? (
          <p className="error-text" style={{ marginTop: '6px', fontSize: '0.8125rem' }}>
            Введенная сумма превышает доступный баланс
          </p>
        ) : (
          <p className="text-muted" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
            {isMaxMode 
              ? <span style={{ color: 'var(--accent-primary)' }}>💡 Отправка всего баланса (комиссия будет вычтена сетью)</span>
              : '💡 Комиссия сети: ~0.005–0.01 TON (вычтется дополнительно)'
            }
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Комментарий (необязательно)</label>
        <input
          type="text"
          className="input"
          placeholder="Сообщение получателю..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={120}
          disabled={hasZeroBalance}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ width: '100%', maxWidth: '300px', margin: '16px auto 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="btn btn-primary btn-large"
          style={{ marginTop: 0 }}
          onClick={handleSend}
          disabled={sendDisabled || hasZeroBalance || isAmountTooHigh}
        >
          Отправить
        </button>
        <button className="btn btn-text" style={{ textAlign: 'center' }} onClick={onBack}>
          Отмена
        </button>
      </div>
    </div>
  );
};
