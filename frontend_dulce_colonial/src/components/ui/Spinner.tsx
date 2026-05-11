export default function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      className="dc-spinner"
      style={{ '--dc-spinner-size': `${size}px` } as React.CSSProperties}
      aria-label="Cargando"
      role="status"
    />
  );
}
