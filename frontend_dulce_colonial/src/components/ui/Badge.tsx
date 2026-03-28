const colors: Record<string, { bg: string; color: string }> = {
  ACTIVO:      { bg: '#d4edda', color: '#155724' },
  INACTIVO:    { bg: '#e2e3e5', color: '#383d41' },
  AGOTADO:     { bg: '#f8d7da', color: '#721c24' },
  ENTRADA:     { bg: '#d4edda', color: '#155724' },
  SALIDA:      { bg: '#fff3cd', color: '#856404' },
  AJUSTE:      { bg: '#d1ecf1', color: '#0c5460' },
  MERMA:       { bg: '#f8d7da', color: '#721c24' },
  ADMIN:       { bg: '#3d1a00', color: '#fff' },
  OPERADOR:    { bg: '#c0392b', color: '#fff' },
  VISOR:       { bg: '#e0d5cc', color: '#1a0a00' },
};

export default function Badge({ label }: { label: string }) {
  const style = colors[label] || { bg: '#e0d5cc', color: '#333' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: style.bg,
      color: style.color,
    }}>
      {label}
    </span>
  );
}