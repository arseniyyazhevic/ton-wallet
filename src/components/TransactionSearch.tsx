import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  onSearch: (query: string) => void;
  onClear: () => void;
}

export const TransactionSearch: React.FC<Props> = ({ onSearch, onClear }) => {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const debouncedSearch = useCallback((val: string) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    
    timeoutRef.current = window.setTimeout(() => {
      if (val.trim()) {
        onSearch(val);
      } else {
        onClear();
      }
    }, 300); // 300ms debounce
  }, [onSearch, onClear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    debouncedSearch(val);
  };

  const handleClear = () => {
    setQuery('');
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    onClear();
  };

  return (
    <div className="tx-search-container" style={{ position: 'relative', marginBottom: '16px' }}>
      <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <input
        type="text"
        className="input"
        placeholder="Поиск по истории..."
        value={query}
        onChange={handleChange}
        style={{ 
          paddingLeft: '44px', 
          paddingRight: '40px', 
          backgroundColor: 'var(--bg-glass)', 
          borderRadius: '16px', 
          border: '1px solid transparent',
          height: '48px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      />
      {query && (
        <button 
          onClick={handleClear}
          style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
