import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertsPanel from '../ui/AlertsPanel';

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Inicio' },
  { to: '/products', icon: 'bakery_dining', label: 'Productos' },
  { to: '/inventory', icon: 'inventory_2', label: 'Inventario' },
  { to: '/movements', icon: 'swap_vert', label: 'Movimientos' },
  { to: '/invoices', icon: 'receipt_long', label: 'Facturas' },
  { to: '/reports', icon: 'analytics', label: 'Reportes' },
  { to: '/cash', icon: 'point_of_sale', label: 'Caja' },
];

const configItems = [
  { to: '/drive/settings', icon: 'cloud', label: 'Google Drive' },
];

const adminItems = [
  { to: '/users', icon: 'group', label: 'Usuarios' },
];

function SidebarLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `dc-sidebar-link ${isActive ? 'active' : ''}`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { isAdmin, logout, user } = useAuth();

  return (
    <aside className="dc-sidebar">
      <div className="dc-sidebar-brand">
        <div className="dc-sidebar-logo">
          <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
            bakery_dining
          </span>
        </div>
        <h1 className="dc-sidebar-title">Dulce Colonial</h1>
        <p className="dc-sidebar-subtitle">Administración</p>
      </div>

      <nav className="dc-sidebar-nav">
        <div className="dc-sidebar-section">Menú</div>
        {navItems.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        <div className="dc-sidebar-section">Configuración</div>
        {configItems.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        {isAdmin && (
          <>
            <div className="dc-sidebar-section">Admin</div>
            {adminItems.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </>
        )}

        <div style={{ padding: '12px 0 0' }}>
          <AlertsPanel />
        </div>
      </nav>

      <div className="dc-sidebar-footer">
        <p className="dc-user-name">{user?.name ?? 'Administrador'}</p>
        <p className="dc-user-role">{user?.role ?? 'ADMIN'}</p>
        <button className="dc-logout-button" onClick={logout} type="button">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
