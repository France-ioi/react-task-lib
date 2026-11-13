import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Must match the exit animation duration in _modal.scss. */
const CLOSE_DURATION_MS = 150;

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.prototype.slice.call(root.querySelectorAll<HTMLElement>(FOCUSABLE)) as HTMLElement[];
}

/**
 * Accessible modal dialog rendered in a portal (no <dialog>: not supported by the target
 * browsers). Focus moves into the dialog (footer button first), Tab stays inside it, Escape and
 * backdrop clicks close it, and focus returns to where it was. It fades in on opening and stays
 * mounted for a short fade-out on closing.
 */
export function Modal({open, title, onClose, children, footer, size = 'lg'}: ModalProps) {
  const t = useLibTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  // Still rendered while the closing animation plays.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const closing = mounted && !open;

  useEffect(() => {
    if (!closing) return undefined;
    const timeout = window.setTimeout(() => setMounted(false), CLOSE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current!;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const footerButtons = focusables(dialog.querySelector('.fioi-modal__footer') ?? dialog);
    (footerButtons[footerButtons.length - 1] ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables(dialog);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.body.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fioi-root fioi-modal${closing ? ' fioi-modal--closing' : ''}`}
      onMouseDown={(event) => {
        if (!closing && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`fioi-modal__dialog fioi-modal__dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={closing || undefined}
        aria-labelledby={titleId}
        tabIndex={-1}
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
