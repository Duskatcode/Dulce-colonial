import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../utils/errorMessage';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bienvenido a Dulce Colonial');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Credenciales inválidas'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🍰 Dulce Colonial</h1>
        <p style={styles.subtitle}>Sistema de Administración</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
    textAlign: 'center',
  },
  title: { fontSize: 28, fontWeight: 700, color: '#1a0a00', margin: 0 },
  subtitle: { color: '#888', marginBottom: 32, marginTop: 8 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  input: {
    padding: '12px 16px', borderRadius: 8,
    border: '1.5px solid #e0d5cc', fontSize: 15,
    outline: 'none', transition: 'border-color 0.2s',
  },
  button: {
    padding: '13px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #c0392b, #922b21)',
    color: '#fff', fontSize: 16, fontWeight: 600,
    cursor: 'pointer', marginTop: 8,
  },
};
