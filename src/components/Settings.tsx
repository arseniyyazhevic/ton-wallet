import React, { useState } from 'react';
import { clearWallet, getTrustedAddresses, addTrustedAddress, removeTrustedAddress } from '../services/storageService';
import { isValidTonAddress } from '../utils/format';
import { showToast } from './Toast';

interface Props {
  address: string;
  onBack: () => void;
  onLock: () => void;
  onLogout: () => void;
}

export const Settings: React.FC<Props> = ({ address, onBack, onLock, onLogout }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [trustedAddresses, setTrustedAddresses] = useState(getTrustedAddresses());
  const [newTrustedAddr, setNewTrustedAddr] = useState('');
  const [newTrustedLabel, setNewTrustedLabel] = useState('');
  const [addError, setAddError] = useState('');

  const handleReset = () => {
    clearWallet();
    onLogout();
  };

  const handleAddTrusted = () => {
    setAddError('');
    const addr = newTrustedAddr.trim();
    const label = newTrustedLabel.trim();

    if (!addr) {
      setAddError('Введите адрес');
      return;
    }
    if (!label) {
      setAddError('Введите название');
      return;
    }
    if (!isValidTonAddress(addr)) {
      setAddError('Неверный формат TON-адреса. Адрес должен быть в формате 0Q..., kQ..., EQ... или raw (0:hex)');
      return;
    }
    if (trustedAddresses.some((t) => t.address === addr)) {
      setAddError('Этот адрес уже добавлен в доверенные');
      return;
    }

    addTrustedAddress(addr, label);
    setTrustedAddresses(getTrustedAddresses());
    setNewTrustedAddr('');
    setNewTrustedLabel('');
    showToast('Адрес добавлен в доверенные', 'success');
  };

  const handleRemoveTrusted = (addr: string) => {
    removeTrustedAddress(addr);
    setTrustedAddresses(getTrustedAddresses());
    showToast('Адрес удалён из доверенных', 'info');
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      showToast('Адрес скопирован', 'success');
    } catch {
      showToast('Не удалось скопировать', 'error');
    }
  };

  return (
    <div className="screen settings-screen">
      <h2>Настройки</h2>

      {/* Wallet info */}
      <div className="settings-section">
        <h3 className="section-title">Кошелёк</h3>
        <div className="settings-info">
          <span className="settings-label">Адрес:</span>
          <span
            className="settings-value mono"
            style={{ cursor: 'pointer' }}
            onClick={handleCopyAddress}
            title="Нажмите, чтобы скопировать"
          >
            {address} 📋
          </span>
        </div>
        <div className="settings-info">
          <span className="settings-label">Сеть:</span>
          <span className="settings-value">TON Testnet</span>
        </div>
        <div className="settings-info">
          <span className="settings-label">Тип кошелька:</span>
          <span className="settings-value">WalletV4R2</span>
        </div>
      </div>

      {/* Session actions */}
      <div className="settings-section">
        <h3 className="section-title">Сессия</h3>
        <p className="text-muted" style={{ marginBottom: '12px' }}>
          Кошелёк автоматически блокируется после 5 минут неактивности.
        </p>
        <button className="btn btn-secondary" onClick={onLock} style={{ width: '100%' }}>
          🔒 Заблокировать кошелёк
        </button>
      </div>

      {/* Trusted addresses */}
      <div className="settings-section">
        <h3 className="section-title">Доверенные адреса</h3>
        <p className="text-muted">
          При отправке на доверенные адреса предупреждения безопасности не показываются.
        </p>

        {trustedAddresses.length > 0 ? (
          <div className="trusted-list">
            {trustedAddresses.map((ta) => (
              <div key={ta.address} className="trusted-item">
                <div>
                  <div className="trusted-label">{ta.label}</div>
                  <div className="trusted-address mono">{ta.address.slice(0, 12)}...{ta.address.slice(-8)}</div>
                </div>
                <button
                  className="btn btn-icon btn-small"
                  onClick={() => handleRemoveTrusted(ta.address)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">Нет доверенных адресов</p>
        )}

        <div className="add-trusted-form">
          <input
            type="text"
            className="input"
            placeholder="TON-адрес (0Q..., kQ...)"
            value={newTrustedAddr}
            onChange={(e) => { setNewTrustedAddr(e.target.value); setAddError(''); }}
            autoComplete="off"
            spellCheck={false}
          />
          <input
            type="text"
            className="input"
            placeholder="Название (напр., Биржа)"
            value={newTrustedLabel}
            onChange={(e) => { setNewTrustedLabel(e.target.value); setAddError(''); }}
          />
          {addError && <div className="error-message">{addError}</div>}
          <button className="btn btn-secondary" onClick={handleAddTrusted}>
            Добавить
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="settings-section danger-zone">
        <h3 className="section-title">Опасная зона</h3>
        <p className="text-muted" style={{ marginBottom: '12px' }}>
          ⚠️ Сброс кошелька удалит все данные из браузера. Восстановление возможно только при наличии мнемонической фразы (24 слова).
        </p>
        {!showResetConfirm ? (
          <button className="btn btn-danger" onClick={() => setShowResetConfirm(true)}>
            Сбросить кошелёк
          </button>
        ) : (
          <div className="reset-confirm">
            <p className="warning-text">
              ⚠️ Все данные кошелька будут удалены! Убедитесь, что вы сохранили мнемоническую фразу.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowResetConfirm(false)}>
                Отмена
              </button>
              <button className="btn btn-danger" onClick={handleReset}>
                Да, сбросить
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
        <button className="btn btn-text" onClick={onBack}>
          Закрыть настройки
        </button>
      </div>
    </div>
  );
};
