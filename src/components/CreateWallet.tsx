import React, { useState, useCallback } from 'react';
import { createWallet } from '../services/walletService';
import { WalletData } from '../types';

interface Props {
  onWalletCreated: (data: WalletData) => void;
  onBack: () => void;
}

export const CreateWallet: React.FC<Props> = ({ onWalletCreated, onBack }) => {
  const [step, setStep] = useState<'generating' | 'display' | 'verify'>('generating');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const generate = useCallback(async () => {
    try {
      setStep('generating');
      const result = await createWallet();
      setMnemonic(result.mnemonic);
      setWalletData({
        address: result.address,
        publicKey: result.publicKey,
        mnemonic: result.mnemonic,
      });

      // Pick 3 random indices for verification
      const indices: number[] = [];
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * 24);
        if (!indices.includes(idx)) indices.push(idx);
      }
      setVerifyIndices(indices.sort((a, b) => a - b));
      setStep('display');
    } catch (err: any) {
      setError(err.message || 'Ошибка генерации кошелька');
    }
  }, []);

  React.useEffect(() => {
    generate();
  }, [generate]);

  const handleProceedToVerify = () => {
    if (!hasBackedUp) {
      setShowSkipWarning(true);
      return;
    }
    setStep('verify');
  };

  const handleVerify = () => {
    setError('');
    for (const idx of verifyIndices) {
      const input = (verifyInputs[idx] || '').trim().toLowerCase();
      if (input !== mnemonic[idx]) {
        setError(`Слово #${idx + 1} введено неверно. Пожалуйста, проверьте вашу запись`);
        return;
      }
    }
    if (walletData) {
      onWalletCreated(walletData);
    }
  };

  if (step === 'generating') {
    return (
      <div className="screen create-screen">
        <div className="loading-container">
          <div className="spinner" />
          <p>Генерация кошелька...</p>
        </div>
      </div>
    );
  }

  if (step === 'display') {
    return (
      <div className="screen create-screen">
        <h2>Ваша секретная фраза</h2>
        <p className="screen-description">
          Запишите эти 24 слова в точном порядке. Это единственный способ восстановить ваш кошелёк.
        </p>

        <div className="mnemonic-grid">
          {mnemonic.map((word, i) => (
            <div key={i} className="mnemonic-word">
              <span className="word-number">{i + 1}</span>
              <span className="word-text">{word}</span>
            </div>
          ))}
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hasBackedUp}
            onChange={(e) => setHasBackedUp(e.target.checked)}
          />
          Я записал(а) секретную фразу в безопасное место
        </label>

        {showSkipWarning && !hasBackedUp && (
          <div className="error-message" style={{ marginTop: '8px' }}>
            ⚠️ Поставьте галочку, подтвердив, что вы записали секретную фразу. Без неё восстановить кошелёк будет невозможно.
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '300px', margin: '16px auto 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn btn-primary btn-large"
            style={{ marginTop: 0 }}
            onClick={handleProceedToVerify}
          >
            Далее — проверка
          </button>
          <button className="btn btn-text" onClick={onBack}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  // Verify step
  return (
    <div className="screen create-screen">
      <h2>Проверка записи</h2>
      <p className="screen-description">
        Введите указанные слова из вашей секретной фразы:
      </p>

      <div className="verify-inputs">
        {verifyIndices.map((idx) => (
          <div key={idx} className="verify-input-group">
            <label>Слово #{idx + 1}</label>
            <input
              type="text"
              className="input"
              placeholder={`Введите слово #${idx + 1}`}
              value={verifyInputs[idx] || ''}
              onChange={(e) =>
                setVerifyInputs((prev) => ({ ...prev, [idx]: e.target.value }))
              }
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ width: '100%', maxWidth: '300px', margin: '16px auto 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button className="btn btn-primary btn-large" style={{ marginTop: 0 }} onClick={handleVerify}>
          Подтвердить
        </button>
        <button className="btn btn-text" onClick={() => setStep('display')}>
          Назад к фразе
        </button>
      </div>
    </div>
  );
};
