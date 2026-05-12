export const REPORT_THEME = {
  brandName: 'Dulce Colonial',
  subtitle: 'Sistema de Administración',
  footer: 'Dulce Colonial — Sistema de Administración',
  colors: {
    primary: '#4b001f',
    secondary: '#7a2f14',
    accent: '#ff7a2f',
    danger: '#c62828',
    warning: '#b45309',
    success: '#2e7d32',
    text: '#1f1f1f',
    muted: '#7a6f6f',
    border: '#eadada',
    background: '#fff8f5',
    tableHeader: '#4b001f',
    tableHeaderText: '#ffffff',
    tableRowAlt: '#fff3ec',
  },
} as const;

export function formatReportDate(date = new Date()) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatReportNumber(value: unknown) {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return '0';
  }

  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
  }).format(numberValue);
}
