import React from 'react';

interface Props {
  onCreateNew: () => void;
  onImport: () => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onCreateNew, onImport }) => {
  return (
    <div className="screen welcome-screen">
      {/* Centered hero — large gem icon + title */}
      <div className="welcome-hero">
        <div className="welcome-gem">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gemGrad" x1="20" y1="10" x2="76" y2="86">
                <stop offset="0%" stopColor="#45AEF5" />
                <stop offset="100%" stopColor="#0098EA" />
              </linearGradient>
              <filter id="gemGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer glow */}
            <circle cx="48" cy="48" r="44" fill="#0098EA" fillOpacity="0.08" />
            {/* TON Diamond shape */}
            <path
              d="M48 8L82 36L48 88L14 36L48 8Z"
              fill="url(#gemGrad)"
              filter="url(#gemGlow)"
            />
            {/* Inner facet lines */}
            <path d="M48 8L14 36H82L48 8Z" fill="white" fillOpacity="0.25" />
            <path d="M14 36L48 88L48 36H14Z" fill="white" fillOpacity="0.1" />
            <path d="M82 36L48 88V36H82Z" fill="black" fillOpacity="0.05" />
            <path d="M48 8L48 36L14 36L48 8Z" fill="white" fillOpacity="0.15" />
            <path d="M48 8L48 36H82L48 8Z" fill="white" fillOpacity="0.05" />
          </svg>
        </div>
        <h1 className="welcome-title">TON Wallet</h1>
        <p className="welcome-tagline">Отправляйте и получайте Toncoin</p>
        <span className="badge badge-testnet">TESTNET</span>
      </div>

      {/* Bottom-anchored actions — Tonkeeper style */}
      <div className="welcome-actions">
        <button className="btn btn-primary btn-large btn-full" onClick={onCreateNew}>
          Создать новый кошелёк
        </button>
        <button className="btn btn-ghost btn-large btn-full" onClick={onImport}>
          У меня уже есть кошелёк
        </button>
      </div>
    </div>
  );
};
