import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { showToast } from './Toast';
import { getBalance } from '../services/walletService';

interface Props {
  address: string;
  onBack: () => void;
}

export const Receive: React.FC<Props> = ({ address, onBack }) => {
  const [received, setReceived] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let baseline: bigint | null = null;
    let done = false;

    const checkBalance = async () => {
      if (done || !isMounted) return;
      try {
        const b = await getBalance(address);
        if (baseline === null) {
          baseline = b;
        } else if (b > baseline) {
          done = true;
          if (isMounted) {
            setReceived(true);
            showToast('Пополнение успешно получено!', 'success');
          }
        }
      } catch {
        if (baseline === null) {
          baseline = BigInt(0); // If fails on first load (e.g., uninitialized), baseline is 0
        }
      }
    };

    checkBalance();
    const interval = setInterval(checkBalance, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, onBack]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      showToast('Адрес скопирован в буфер обмена', 'success');
    } catch {
      showToast('Не удалось скопировать. Выделите адрес вручную', 'error');
    }
  };

  const tonLink = `ton://transfer/${address}`;

  if (received) {
    return (
      <div className="screen receive-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
          <h2>Пополнение получено!</h2>
          <p className="text-muted" style={{ marginTop: '8px', marginBottom: '24px' }}>
            Ваш баланс успешно пополнен.
          </p>
          <button className="btn btn-primary btn-large" onClick={onBack}>
            Отлично
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen receive-screen">
      <h2>Получить TON</h2>
      <p className="screen-description">
        Отправьте этот адрес или отсканируйте QR-код для получения TON в testnet.
      </p>

      <div className="receive-qr-container">
        <div className="qr-wrapper">
          <QRCodeSVG
            value={tonLink}
            size={200}
            bgColor="transparent"
            fgColor="#e0e0e0"
            level="M"
          />
        </div>
      </div>

      <div className="receive-address-container">
        <div className="receive-address-box" onClick={handleCopy}>
          <p className="receive-address">{address}</p>
        </div>
        <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary btn-large" style={{ marginTop: 0 }} onClick={handleCopy}>
            📋 Копировать адрес
          </button>
          <button className="btn btn-text" onClick={onBack}>
            Назад
          </button>
        </div>
      </div>

      <div className="receive-note">
        <p>💡 Получите тестовые TON через бот:</p>
        <a
          href="https://t.me/testgiver_ton_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="faucet-link"
        >
          @testgiver_ton_bot
        </a>
      </div>
    </div>
  );
};
