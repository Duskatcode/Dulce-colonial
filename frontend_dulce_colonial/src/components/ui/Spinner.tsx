export default function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid #f0e6dc`,
      borderTop: `3px solid #c0392b`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}