import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CreateWallet } from './components/CreateWallet';
import { ImportWallet } from './components/ImportWallet';
import { PinSetup, PinEntry } from './components/PinScreens';
import { Dashboard } from './components/Dashboard';
import { Receive } from './components/Receive';
import { Send } from './components/Send';
import { Settings } from './components/Settings';
import { ToastContainer, showToast } from './components/Toast';
import { hasStoredWallet, encryptAndStore, decryptAndLoad, clearWallet } from './services/storageService';
import { Screen, WalletData } from './types';
import './App.css';

const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing wallet on mount
  useEffect(() => {
    if (hasStoredWallet()) {
      setScreen('pin-entry');
    }
  }, []);

  // --- Auto-lock: lock wallet after 5 min of inactivity ---
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    // Only set timer when wallet is unlocked (we have walletData and not on PIN/welcome screens)
    if (walletData) {
      autoLockTimer.current = setTimeout(() => {
        setWalletData(null);
        setPinError('');
        if (hasStoredWallet()) {
          setScreen('pin-entry');
          showToast('Кошелёк заблокирован из-за неактивности', 'info');
        }
      }, AUTO_LOCK_TIMEOUT_MS);
    }
  }, [walletData]);

  useEffect(() => {
    if (!walletData) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetAutoLockTimer();

    events.forEach((e) => window.addEventListener(e, handler));
    resetAutoLockTimer(); // Start the timer

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    };
  }, [walletData, resetAutoLockTimer]);

  // --- Handlers ---

  const handleWalletCreated = (data: WalletData) => {
    setWalletData(data);
    setScreen('pin-setup');
  };

  const handleWalletImported = (data: WalletData) => {
    setWalletData(data);
    setScreen('pin-setup');
  };

  const handlePinSet = async (pin: string) => {
    if (!walletData) return;
    try {
      await encryptAndStore(walletData.mnemonic, pin, walletData.address, walletData.publicKey);
      setScreen('dashboard');
    } catch (err: any) {
      setPinError(err.message || 'Ошибка сохранения');
    }
  };

  const handlePinEntered = async (pin: string) => {
    setPinError('');
    setPinLoading(true);
    try {
      const result = await decryptAndLoad(pin);
      setWalletData({
        address: result.address,
        publicKey: result.publicKey,
        mnemonic: result.mnemonic,
      });
      setScreen('dashboard');
    } catch (err: any) {
      setPinError(err.message || 'Неверный PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const handleResetWallet = () => {
    clearWallet();
    setWalletData(null);
    setScreen('welcome');
  };

  /** Lock wallet — go to PIN entry without deleting data from localStorage */
  const handleLock = () => {
    setWalletData(null);
    setPinError('');
    setScreen('pin-entry');
  };

  /** Full logout — clear in-memory data and go to welcome */
  const handleLogout = () => {
    setWalletData(null);
    setScreen('welcome');
  };

  // --- Render ---

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return (
          <WelcomeScreen
            onCreateNew={() => setScreen('create')}
            onImport={() => setScreen('import')}
          />
        );

      case 'create':
        return (
          <CreateWallet
            onWalletCreated={handleWalletCreated}
            onBack={() => setScreen('welcome')}
          />
        );

      case 'import':
        return (
          <ImportWallet
            onWalletImported={handleWalletImported}
            onBack={() => setScreen('welcome')}
          />
        );

      case 'pin-setup':
        return (
          <PinSetup
            onPinSet={handlePinSet}
            onBack={() => setScreen('welcome')}
          />
        );

      case 'pin-entry':
        return (
          <PinEntry
            onPinEntered={handlePinEntered}
            onReset={handleResetWallet}
            error={pinError}
            loading={pinLoading}
          />
        );

      case 'dashboard':
        return walletData ? (
          <Dashboard
            address={walletData.address}
            onSend={() => setScreen('send')}
            onReceive={() => setScreen('receive')}
            onSettings={() => setScreen('settings')}
          />
        ) : null;

      case 'receive':
        return walletData ? (
          <Receive
            address={walletData.address}
            onBack={() => setScreen('dashboard')}
          />
        ) : null;

      case 'send':
        return walletData ? (
          <Send
            address={walletData.address}
            mnemonic={walletData.mnemonic}
            onBack={() => setScreen('dashboard')}
            onSuccess={() => setScreen('dashboard')}
          />
        ) : null;

      case 'settings':
        return walletData ? (
          <Settings
            address={walletData.address}
            onBack={() => setScreen('dashboard')}
            onLock={handleLock}
            onLogout={handleLogout}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <div className="app-phone-frame">
        {renderScreen()}
      </div>
      <ToastContainer />
    </div>
  );
};

export default App;
