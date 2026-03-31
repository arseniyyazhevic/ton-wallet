import React, { useState } from 'react';
import { importWallet } from '../services/walletService';
import { WalletData } from '../types';

interface Props {
  onWalletImported: (data: WalletData) => void;
  onBack: () => void;
}

export const ImportWallet: React.FC<Props> = ({ onWalletImported, onBack }) => {
  const [wordInputs, setWordInputs] = useState<string[]>(Array(24).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setError('');
    setLoading(true);

    try {
      const words = wordInputs.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0);

      if (words.length !== 24) {
        setError(`Фраза должна содержать ровно 24 слова (введено: ${words.length})`);
        setLoading(false);
        return;
      }

      const result = await importWallet(words);
      onWalletImported({
        address: result.address,
        publicKey: result.publicKey,
        mnemonic: result.mnemonic,
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка импорта. Проверьте правильность слов.');
    } finally {
      setLoading(false);
    }
  };

  const handleWordChange = (index: number, value: string) => {
    // Only allow letters
    const filteredValue = value.replace(/[^a-zA-Z]/g, '').toLowerCase();
    setWordInputs((prev) => {
      const next = [...prev];
      next[index] = filteredValue;
      return next;
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split by any whitespace and strip non-alpha characters
    const words = pastedText
      .trim()
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase())
      .filter(w => w.length > 0);

    if (words.length > 0) {
      setWordInputs(prev => {
        const next = [...prev];
        let currentWordIndex = 0;
        // Distribute pasted words starting from the current input cell
        for (let i = startIndex; i < 24 && currentWordIndex < words.length; i++) {
          next[i] = words[currentWordIndex];
          currentWordIndex++;
        }
        return next;
      });
      setError('');
    }
  };

  return (
    <div className="screen import-screen">
      <h2>Импорт кошелька</h2>
      <p className="screen-description text-muted" style={{ marginBottom: '24px' }}>
        Вставьте все 24 слова в первое поле или вводите их по одному.
      </p>

      <div className="word-grid">
        {wordInputs.map((word, i) => (
          <div key={i} className="word-input-group">
            <span className="word-number-label">{i + 1}.</span>
            <input
              type="text"
              className="input input-small"
              value={word}
              onChange={(e) => handleWordChange(i, e.target.value)}
              onPaste={(e) => handlePaste(e, i)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        ))}
      </div>

      {error && <div className="error-message" style={{ marginTop: '16px' }}>{error}</div>}

      <div style={{ width: '100%', maxWidth: '300px', margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="btn btn-primary btn-large"
          style={{ marginTop: 0 }}
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-inline" /> Импорт...
            </>
          ) : (
            'Импортировать кошелёк'
          )}
        </button>
        <button className="btn btn-text" onClick={onBack} disabled={loading}>
          Отмена
        </button>
      </div>
    </div>
  );
};
