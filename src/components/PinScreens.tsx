import React, { useState } from 'react';

interface PinSetupProps {
  onPinSet: (pin: string) => void;
  onBack: () => void;
}

export const PinSetup: React.FC<PinSetupProps> = ({ onPinSet, onBack }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [error, setError] = useState('');

  const handleSetPin = () => {
    if (pin.length < 4 || pin.length > 8) {
      setError('PIN должен быть от 4 до 8 цифр');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setError('PIN должен содержать только цифры');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (confirmPin !== pin) {
      setError('PIN-коды не совпадают');
      setConfirmPin('');
      return;
    }
    onPinSet(pin);
  };

  return (
    <div className="screen pin-screen">
      <h2>{step === 'set' ? '🔐 Задайте PIN-код' : '🔐 Подтвердите PIN-код'}</h2>
      <p className="screen-description">
        {step === 'set'
          ? 'Задайте безопасный PIN-код для входа. Он понадобится каждый раз при открытии кошелька.'
          : 'Введите тот же PIN-код ещё раз, чтобы убедиться, что вы его запомнили.'}
      </p>

      <div className="pin-input-container">
        <input
          type="password"
          className="input pin-input"
          placeholder="PIN-код"
          value={step === 'set' ? pin : confirmPin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
            step === 'set' ? setPin(val) : setConfirmPin(val);
          }}
          inputMode="numeric"
          maxLength={8}
          autoFocus
        />
        <div className="pin-dots">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`pin-dot ${i < (step === 'set' ? pin.length : confirmPin.length) ? 'filled' : ''}`}
            />
          ))}
        </div>
        
        {step === 'set' && (
          <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.8125rem', marginTop: '12px' }}>
            От 4 до 8 цифр
          </p>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="btn btn-primary btn-large"
          style={{ marginTop: 0 }}
          onClick={step === 'set' ? handleSetPin : handleConfirm}
          disabled={step === 'set' ? pin.length < 4 : confirmPin.length < 4}
        >
          {step === 'set' ? 'Далее' : 'Подтвердить'}
        </button>
        <button
          className="btn btn-text"
          onClick={() => {
            if (step === 'confirm') {
              setConfirmPin('');
              setError('');
              setStep('set');
            } else {
              onBack();
            }
          }}
        >
          {step === 'confirm' ? 'Ввести PIN заново' : 'Отмена'}
        </button>
      </div>
    </div>
  );
};

// --- PIN Entry for returning users ---

interface PinEntryProps {
  onPinEntered: (pin: string) => void;
  onReset: () => void;
  error?: string;
  loading?: boolean;
}

export const PinEntry: React.FC<PinEntryProps> = ({ onPinEntered, onReset, error, loading }) => {
  const [pin, setPin] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onPinEntered(pin);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="screen pin-screen">
      <div className="welcome-logo" style={{ marginBottom: '2rem' }}>
        <div className="logo-icon logo-small">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="url(#grad2)" />
            <path d="M14 18L24 14L34 18V30L24 34L14 30V18Z" fill="white" fillOpacity="0.9" />
            <defs>
              <linearGradient id="grad2" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="#0098EA" />
                <stop offset="100%" stopColor="#00D4AA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      
      <h2>Введите PIN-код</h2>

      <div className="pin-input-container">
        <input
          type="password"
          className="input pin-input"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={handleKeyDown}
          inputMode="numeric"
          maxLength={8}
          autoFocus
          disabled={loading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', maxWidth: '280px' }}>
        После 5 неверных попыток ввод блокируется на 60 секунд.
      </p>

      <button
        className="btn btn-primary btn-large"
        onClick={handleSubmit}
        disabled={pin.length < 4 || loading}
      >
        {loading ? <span className="spinner-inline" /> : 'Войти'}
      </button>

      {!showResetConfirm ? (
        <button className="btn btn-text" onClick={() => setShowResetConfirm(true)}>
          Забыли PIN?
        </button>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>
            Единственный способ восстановления — сбросить кошелёк и импортировать заново по фразе.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn-danger btn-small" onClick={onReset}>
              Сбросить кошелёк
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setShowResetConfirm(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
