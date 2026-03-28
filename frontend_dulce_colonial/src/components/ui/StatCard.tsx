interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
}

export default function StatCard({ label, value, icon, color = '#c0392b', subtitle }: StatCardProps) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <span style={{ fontSize: 32 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1a0a00' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: color, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}