interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
  accent?: 'primary' | 'secondary' | 'warning' | 'error';
  iconType?: 'emoji' | 'material';
}

export default function StatCard({
  label,
  value,
  icon,
  subtitle,
  accent = 'primary',
  iconType = 'emoji',
}: StatCardProps) {
  return (
    <article className="dc-stat-card" data-accent={accent}>
      <div className="dc-stat-card-header">
        <p className="dc-stat-label">{label}</p>

        <div className="dc-stat-icon" data-accent={accent}>
          {iconType === 'material' ? (
            <span className="material-symbols-outlined">{icon}</span>
          ) : (
            <span style={{ fontSize: 24 }}>{icon}</span>
          )}
        </div>
      </div>

      <div className="dc-stat-value-wrap">
        <p className="dc-stat-value">{value}</p>
        {subtitle && <p className="dc-stat-subtitle">{subtitle}</p>}
      </div>
    </article>
  );
}
