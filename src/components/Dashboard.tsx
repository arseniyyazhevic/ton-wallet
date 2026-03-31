import React, { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { getBalance, getTransactions } from '../services/walletService';
import { formatTon, truncateAddress } from '../utils/format';
import { TransactionList } from './TransactionList';
import { TransactionSearch } from './TransactionSearch';
import { showToast } from './Toast';

interface Props {
  address: string;
  onSend: () => void;
  onReceive: () => void;
  onSettings: () => void;
}

export const Dashboard: React.FC<Props> = ({ address, onSend, onReceive, onSettings }) => {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState('');
  const [filteredTx, setFilteredTx] = useState<Transaction[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const PAGE_SIZE = 20;

  const fetchBalance = useCallback(async (retry = 2) => {
    try {
      const b = await getBalance(address);
      setBalance(b);
      setBalanceError('');
      setLastUpdated(new Date());
      setBalanceLoading(false);
    } catch (err: any) {
      if (retry > 0) {
        setTimeout(() => fetchBalance(retry - 1), 3000);
      } else {
        setBalanceError('Не удалось загрузить баланс');
        setBalanceLoading(false);
      }
    }
  }, [address]);

  const fetchTransactions = useCallback(async (offset = 0, append = false, retry = 2) => {
    try {
      if (!append) setTxLoading(true);
      const txs = await getTransactions(address, PAGE_SIZE, offset);
      if (append) {
        setTransactions((prev) => [...prev, ...txs]);
      } else {
        setTransactions(txs);
      }
      setHasMore(txs.length === PAGE_SIZE);
      setTxError('');
    } catch (err: any) {
      if (retry > 0) {
        setTimeout(() => fetchTransactions(offset, append, retry - 1), 3000);
        return;
      }
      if (!append) {
        setTxError('Не удалось загрузить историю транзакций');
      }
    } finally {
      setTxLoading(false);
    }
  }, [address]);

  useEffect(() => {
    // TonCenter free tier: ~1 req/sec. Stagger initial loads.
    fetchBalance();
    
    const txTimeout = setTimeout(() => {
      fetchTransactions();
    }, 2000);

    // Poll balance every 15 seconds (was 10s — more headroom for rate-limits)
    const interval = setInterval(() => {
      fetchBalance();
      setTimeout(fetchTransactions, 3000);
    }, 15000);

    return () => {
      clearTimeout(txTimeout);
      clearInterval(interval);
    };
  }, [fetchBalance, fetchTransactions]);

  const handleLoadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchTransactions(newPage * PAGE_SIZE, true);
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchBalance();
    // Stagger to avoid 429
    await new Promise(r => setTimeout(r, 2000));
    await fetchTransactions();
    setRefreshing(false);
    showToast('Данные обновлены', 'success');
  };

  const handleSearch = (query: string) => {
    const lower = query.toLowerCase();
    const filtered = transactions.filter((tx) => {
      return (
        tx.from.toLowerCase().includes(lower) ||
        tx.to.toLowerCase().includes(lower) ||
        tx.comment.toLowerCase().includes(lower) ||
        formatTon(tx.amount).includes(lower) ||
        tx.hash.toLowerCase().includes(lower)
      );
    });
    setFilteredTx(filtered);
  };

  const handleClearSearch = () => {
    setFilteredTx(null);
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      showToast('Адрес скопирован в буфер обмена', 'success');
    } catch {
      showToast('Не удалось скопировать. Выделите адрес вручную', 'error');
    }
  };

  const displayTx = filteredTx !== null ? filteredTx : transactions;

  return (
    <div className="screen dashboard-screen">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-top">
          <h2 className="app-title">TON Wallet</h2>
          <button className="btn btn-icon" onClick={onSettings} title="Настройки">
            ⚙️
          </button>
        </div>

        {/* Address */}
        <div className="address-bar" onClick={handleCopyAddress}>
          <span className="address-text">{truncateAddress(address, 8, 6)}</span>
          <span className="copy-icon" title="Копировать">📋</span>
        </div>

        {/* Balance */}
        <div className="balance-display">
          {balanceLoading ? (
            <div className="balance-loading">
              <div className="spinner-inline" />
            </div>
          ) : balanceError ? (
            <div className="balance-error">
              <p>{balanceError}</p>
              <button className="btn btn-text btn-small" onClick={() => fetchBalance(1)}>
                Повторить
              </button>
            </div>
          ) : (
            <>
              <div className="balance-amount">{formatTon(balance ?? BigInt(0))}</div>
              <div className="balance-currency">TON</div>
              {lastUpdated && (
                <p className="text-muted" style={{ marginTop: '4px', fontSize: '0.6875rem' }}>
                  Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
                </p>
              )}
            </>
          )}
        </div>

        <div className="action-row">
          <button className="icon-action-btn" onClick={onSend}>
            <div className="icon-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </div>
            <span className="action-label">Отправить</span>
          </button>

          <button className="icon-action-btn" onClick={onReceive}>
            <div className="icon-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </div>
            <span className="action-label">Получить</span>
          </button>

          <button 
            className="icon-action-btn" 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={{ opacity: refreshing ? 0.5 : 1 }}
          >
            <div className={`icon-circle ${refreshing ? 'spinning' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </div>
            <span className="action-label">Обновить</span>
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="dashboard-transactions">
        <h3 className="section-title">История транзакций</h3>
        <TransactionSearch onSearch={handleSearch} onClear={handleClearSearch} />
        <TransactionList
          transactions={displayTx}
          loading={txLoading}
          error={txError}
          onLoadMore={handleLoadMore}
          hasMore={hasMore && filteredTx === null}
        />
      </div>
    </div>
  );
};
