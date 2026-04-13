import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertsPanel from '../ui/AlertsPanel';

const navItems = [
  { to: '/dashboard',  icon: '🏠', label: 'Inicio'       },
  { to: '/products',   icon: '🍰', label: 'Productos'     },
  { to: '/inventory',  icon: '📦', label: 'Inventario'    },
  { to: '/movements',  icon: '↕️',  label: 'Movimientos'   },
  { to: '/reports',    icon: '📊', label: 'Reportes'      },
  { to: '/cash', icon: '🏧', label: 'Caja' },
];

const adminItems = [
  { to: '/users', icon: '👥', label: 'Usuarios' },
];

const configItems = [
  {
    to: '/drive/settings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </svg>
    ),
    label: 'Google Drive',
  },
];

export default function Sidebar() {
  const { isAdmin, logout, user } = useAuth();

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 8,
    textDecoration: 'none', fontSize: 14, fontWeight: 500,
    color: active ? '#fff' : '#c8a99a',
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'all 0.15s',
  });

  return (
    <aside style={{
      width: 220, background: 'linear-gradient(180deg, #1a0a00 0%, #2d1200 100%)',
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      padding: '0 12px', position: 'fixed', left: 0, top: 0, bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 8px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>🍰 Dulce Colonial</div>
        <div style={{ fontSize: 11, color: '#c8a99a', marginTop: 4 }}>Administración</div>
      </div>

      {/* Nav principal */}
      <nav style={{ marginTop: 16, flex: 1 }}>
        <div style={{ fontSize: 10, color: '#8a6a5a', padding: '4px 8px 8px', letterSpacing: 1 }}>
          MENÚ
        </div>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => linkStyle(isActive)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div style={{ fontSize: 10, color: '#8a6a5a', padding: '16px 8px 8px', letterSpacing: 1 }}>
          CONFIGURACIÓN
        </div>
        {configItems.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => linkStyle(isActive)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ fontSize: 10, color: '#8a6a5a', padding: '16px 8px 8px', letterSpacing: 1 }}>
              ADMIN
            </div>
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to} style={({ isActive }) => linkStyle(isActive)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div style={{ padding: '0 0 8px' }}>
        <AlertsPanel />
      </div>
      {/* Usuario */}
      <div style={{ padding: '16px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{user?.name}</div>
        <div style={{ fontSize: 11, color: '#c8a99a', marginBottom: 10 }}>{user?.role}</div>
        <button onClick={logout} style={{
          width: '100%', padding: '8px', borderRadius: 6,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', cursor: 'pointer', fontSize: 13,
        }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
