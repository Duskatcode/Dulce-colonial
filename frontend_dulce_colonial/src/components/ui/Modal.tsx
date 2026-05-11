import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, width = 520 }: ModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="dc-modal-backdrop" onClick={onClose}>
      <section
        className="dc-modal-card"
        style={{ maxWidth: width }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="dc-modal-header">
          <h3 className="dc-modal-title">{title}</h3>

          <button className="dc-modal-close" onClick={onClose} type="button" aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="dc-modal-body">{children}</div>
      </section>
    </div>
  );
}
