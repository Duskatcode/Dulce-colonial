interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function Table<T extends { id: number }>({
  columns, data, loading, emptyMessage = 'Sin registros',
}: TableProps<T>) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#faf5f0' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 14px', textAlign: 'left',
                color: '#1a0a00', fontWeight: 600,
                borderBottom: '2px solid #f0e6dc', whiteSpace: 'nowrap',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                textAlign: 'center', padding: 32, color: '#aaa',
              }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f5f0eb' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#faf5f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '10px 14px', color: '#333' }}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}