import type { FormEvent } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorMessage';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
    <main className="dc-login-page">
      <section className="dc-login-card" aria-label="Inicio de sesión Dulce Colonial">
        <div className="dc-login-brand">
          <div className="dc-login-logo">
            <span className="material-symbols-outlined" style={{ fontSize: 42 }}>
              bakery_dining
            </span>
          </div>

          <h1 className="dc-login-title">Bienvenido a Dulce Colonial</h1>
          <p className="dc-login-subtitle">Administración de Pastelería</p>
        </div>

        <form className="dc-login-form" onSubmit={handleSubmit}>
          <div>
            <label className="dc-field-label" htmlFor="email">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                mail
              </span>
              Correo electrónico
            </label>
            <input
              id="email"
              className="dc-login-input"
              type="email"
              placeholder="admin@dulcecolonial.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="dc-field-label" htmlFor="password">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                lock
              </span>
              Contraseña
            </label>

            <div className="dc-password-wrap">
              <input
                id="password"
                className="dc-login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                className="dc-password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <button className="dc-login-button" type="submit" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="dc-login-note">Acceso exclusivo para personal autorizado.</p>
      </section>
    </main>
  );
}
