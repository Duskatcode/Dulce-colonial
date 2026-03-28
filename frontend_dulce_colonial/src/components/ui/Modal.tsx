import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%',
        maxWidth: width, boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f0e6dc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, color: '#1a0a00', fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}
