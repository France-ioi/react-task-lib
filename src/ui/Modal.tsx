import {useEffect, useId, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useLibTranslation} from '../react/context';

export interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  /** Buttons. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Accessible modal dialog rendered in a portal (no <dialog>: not supported by the target
 * browsers). Closes on Escape and backdrop click.
 */
export function Modal({open, title, onClose, children, footer, size = 'lg'}: ModalProps) {
  const t = useLibTranslation();
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fioi-root fioi-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`fioi-modal__dialog fioi-modal__dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="fioi-modal__header">
          <h5 className="fioi-modal__title" id={titleId}>
            {title}
          </h5>
          <button type="button" className="fioi-modal__close" aria-label={t('modal.close')} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="fioi-modal__body">{children}</div>
        {footer ? <div className="fioi-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
