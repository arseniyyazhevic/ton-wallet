import React from 'react';
import { Transaction } from '../types';
import { formatTon, truncateAddress, formatDate } from '../utils/format';

import { showToast } from './Toast';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  error?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const TransactionList: React.FC<Props> = ({
  transactions,
  loading,
  error,
  onLoadMore,
  hasMore,
}) => {
  const handleCopy = async (address: string) => {
    try {
      if (!address || address === 'Неизвестно') return;
      await navigator.clipboard.writeText(address);
      showToast('Адрес скопирован', 'success');
    } catch {
      showToast('Не удалось скопировать', 'error');
    }
  };
  if (loading && transactions.length === 0) {
    return (
      <div className="tx-list-empty">
        <div className="spinner" />
        <p>Загрузка транзакций...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-list-empty">
        <p className="error-text">❌ {error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="tx-list-empty">
        <div className="empty-icon">📭</div>
        <p>Транзакций пока нет</p>
        <p className="text-muted">
          Получите тестовые TON через{' '}
          <a href="https://t.me/testgiver_ton_bot" target="_blank" rel="noopener noreferrer">
            @testgiver_ton_bot
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="tx-list">
      {transactions.map((tx, i) => (
        <div key={`${tx.hash}-${i}`} className={`tx-item tx-${tx.type}`}>
          <div className="tx-icon">
            {tx.type === 'in' ? '↓' : '↑'}
          </div>
          <div className="tx-details">
            <div 
              className="tx-address" 
              onClick={() => handleCopy(tx.type === 'in' ? tx.from : tx.to)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Нажмите, чтобы скопировать полный адрес"
            >
              {tx.type === 'in' ? 'от ' : 'кому '}
              <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                {truncateAddress(tx.type === 'in' ? (tx.from || 'Неизвестно') : tx.to)}
              </span>
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>📋</span>
            </div>
            <div className="tx-time">{formatDate(tx.timestamp)}</div>
            {tx.comment && <div className="tx-comment">💬 {tx.comment}</div>}
          </div>
          <div className={`tx-amount ${tx.type === 'in' ? 'amount-in' : 'amount-out'}`}>
            {tx.type === 'in' ? '+' : '-'}{formatTon(tx.amount)} TON
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          className="btn btn-secondary btn-load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Загрузить ещё'}
        </button>
      )}
    </div>
  );
};
