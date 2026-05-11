const colors: Record<string, { bg: string; color: string }> = {
  ACTIVO: { bg: 'var(--dc-secondary-fixed)', color: '#351000' },
  INACTIVO: { bg: 'var(--dc-surface-container-highest)', color: 'var(--dc-on-surface-variant)' },
  AGOTADO: { bg: 'var(--dc-error-container)', color: 'var(--dc-on-error-container)' },

  ENTRADA: { bg: 'var(--dc-secondary-fixed)', color: '#351000' },
  SALIDA: { bg: 'var(--dc-primary-fixed)', color: 'var(--dc-primary)' },
  AJUSTE: { bg: 'var(--dc-surface-container-highest)', color: 'var(--dc-primary)' },
  MERMA: { bg: 'var(--dc-error-container)', color: 'var(--dc-on-error-container)' },

  ADMIN: { bg: 'var(--dc-primary)', color: 'var(--dc-on-primary)' },
  OPERADOR: { bg: 'var(--dc-primary-container)', color: 'var(--dc-on-primary)' },
  VISOR: { bg: 'var(--dc-surface-container-highest)', color: 'var(--dc-on-surface)' },

  BAJO_MINIMO: { bg: 'var(--dc-error-container)', color: 'var(--dc-on-error-container)' },
  OPTIMO: { bg: 'var(--dc-secondary-fixed)', color: '#351000' },
};

const labels: Record<string, string> = {
  BAJO_MINIMO: 'Bajo mínimo',
  OPTIMO: 'Óptimo',
};

export default function Badge({ label }: { label: string }) {
  const style = colors[label] || {
    bg: 'var(--dc-surface-container-highest)',
    color: 'var(--dc-on-surface-variant)',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        lineHeight: '16px',
        fontWeight: 900,
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {labels[label] ?? label}
    </span>
  );
}
