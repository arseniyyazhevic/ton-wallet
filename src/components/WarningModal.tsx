import React from 'react';
import { AddressWarning } from '../types';

interface Props {
  warnings: AddressWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const WarningModal: React.FC<Props> = ({ warnings, onConfirm, onCancel }) => {
  const [confirmed, setConfirmed] = React.useState(false);
  const hasCritical = warnings.some((w) => w.level === 'critical');

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className={`modal warning-modal ${hasCritical ? 'modal-critical' : 'modal-warning'}`}>
        <div className="modal-header">
          <h3>{hasCritical ? '🚨 Критическое предупреждение' : '⚠️ Предупреждение'}</h3>
        </div>

        <div className="modal-body">
          {warnings.map((warning, i) => (
            <div key={i} className={`warning-item warning-${warning.level}`}>
              <div className="warning-title">{warning.title}</div>
              <div className="warning-message">{warning.message}</div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <label className="checkbox-label checkbox-danger">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Я понимаю риски и хочу продолжить
          </label>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onCancel}>
              Отмена
            </button>
            <button
              className={`btn ${hasCritical ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={!confirmed}
            >
              Всё равно отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Confirm Send Modal ---

interface ConfirmProps {
  recipientAddress: string;
  amount: string;
  comment?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmSendModal: React.FC<ConfirmProps> = ({
  recipientAddress,
  amount,
  comment,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="modal confirm-modal">
        <div className="modal-header">
          <h3>Подтвердите отправку</h3>
        </div>

        <div className="modal-body">
          <div className="confirm-detail">
            <span className="confirm-label">Получатель:</span>
            <span className="confirm-value confirm-address">{recipientAddress}</span>
          </div>
          <div className="confirm-detail">
            <span className="confirm-label">Сумма:</span>
            <span className="confirm-value confirm-amount">{amount} TON</span>
          </div>
          {comment && (
            <div className="confirm-detail">
              <span className="confirm-label">Комментарий:</span>
              <span className="confirm-value">{comment}</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Подтвердить отправку
          </button>
        </div>
      </div>
    </div>
  );
};
