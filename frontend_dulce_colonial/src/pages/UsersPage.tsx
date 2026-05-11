import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { activityService } from '../services/activity.service';
import { usersService } from '../services/users.service';
import type { Role, User } from '../types';
import { getApiErrorMessage } from '../utils/errorMessage';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  entityId?: number | null;
  createdAt: string;
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'OPERADOR',
};

const roleMeta: Record<Role, { label: string; helper: string; icon: string }> = {
  ADMIN: {
    label: 'Administrador',
    helper: 'Control total del sistema',
    icon: 'admin_panel_settings',
  },
  OPERADOR: {
    label: 'Operador',
    helper: 'Caja, inventario y movimientos',
    icon: 'point_of_sale',
  },
  VISOR: {
    label: 'Visor',
    helper: 'Consulta sin acciones críticas',
    icon: 'visibility',
  },
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function UsersPage() {
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: usersService.getAll,
  });

  const { data: userActivity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ['activity-user', selectedUser?.id],
    queryFn: () => activityService.getByUser(selectedUser!.id),
    enabled: !!selectedUser && activityOpen,
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado');
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al crear usuario'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario desactivado');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al desactivar usuario'));
    },
  });

  const activeUsers = useMemo(
    () => users?.filter((user) => user.isActive).length ?? 0,
    [users],
  );

  const inactiveUsers = useMemo(
    () => users?.filter((user) => !user.isActive).length ?? 0,
    [users],
  );

  const adminUsers = useMemo(
    () => users?.filter((user) => user.role === 'ADMIN').length ?? 0,
    [users],
  );

  const operatorUsers = useMemo(
    () => users?.filter((user) => user.role === 'OPERADOR').length ?? 0,
    [users],
  );

  const openActivity = (user: User) => {
    setSelectedUser(user);
    setActivityOpen(true);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (!form.email.trim()) {
      toast.error('El correo es obligatorio');
      return;
    }

    if (!form.password.trim()) {
      toast.error('La contraseña es obligatoria');
      return;
    }

    createMutation.mutate(form);
  };

  return (
    <AppLayout title="Usuarios">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Administración</p>
          <h1 className="dc-page-title">Usuarios</h1>
          <p className="dc-page-subtitle">
            Gestiona accesos internos, roles operativos y actividad reciente del equipo.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          <button
            className="dc-button-primary"
            style={{ padding: '12px 18px' }}
            type="button"
            onClick={openCreate}
          >
            Nuevo usuario
          </button>
        </div>
      </section>

      <section className="dc-inventory-stats" aria-label="Resumen de usuarios">
        <StatCard
          icon="group"
          iconType="material"
          label="Usuarios totales"
          value={users?.length ?? 0}
          subtitle="Cuentas registradas"
          accent="primary"
        />

        <StatCard
          icon="check_circle"
          iconType="material"
          label="Activos"
          value={activeUsers}
          subtitle="Pueden ingresar"
          accent="secondary"
        />

        <StatCard
          icon="block"
          iconType="material"
          label="Inactivos"
          value={inactiveUsers}
          subtitle="Acceso bloqueado"
          accent="error"
        />

        <StatCard
          icon="admin_panel_settings"
          iconType="material"
          label="Admins / Operadores"
          value={`${adminUsers}/${operatorUsers}`}
          subtitle="Control y operación"
          accent="warning"
        />
      </section>

      <section className="dc-inventory-panel">
        <div className="dc-dashboard-panel-header">
          <h2 className="dc-dashboard-panel-title">Cuentas del sistema</h2>
          <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
            manage_accounts
          </span>
        </div>

        <div className="dc-inventory-table-wrap">
          <table className="dc-inventory-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="dc-empty-state">Cargando usuarios...</div>
                  </td>
                </tr>
              ) : (users?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="dc-empty-state">No hay usuarios registrados</div>
                  </td>
                </tr>
              ) : (
                users!.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="dc-user-name-cell">
                        <span className="dc-user-avatar">
                          {getInitials(user.name) || 'U'}
                        </span>

                        <div>
                          <div className="dc-user-name">{user.name}</div>
                          <div className="dc-user-email">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <Badge label={user.role} />
                    </td>

                    <td>
                      <Badge label={user.isActive ? 'ACTIVO' : 'INACTIVO'} />
                    </td>

                    <td>{formatDate(user.createdAt)}</td>

                    <td>
                      <div className="dc-inventory-actions">
                        <button
                          className="dc-icon-action"
                          type="button"
                          title="Ver actividad"
                          onClick={() => openActivity(user)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                            history
                          </span>
                        </button>

                        {user.isActive && (
                          <button
                            className="dc-icon-action danger"
                            type="button"
                            title="Desactivar"
                            disabled={deactivateMutation.isPending}
                            onClick={() => deactivateMutation.mutate(user.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                              block
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario" width={620}>
        <div className="dc-form-stack">
          <Field
            label="Nombre completo"
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
          />

          <Field
            label="Correo"
            type="email"
            value={form.email}
            onChange={(value) => setForm({ ...form, email: value })}
          />

          <Field
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(value) => setForm({ ...form, password: value })}
          />

          <div>
            <label className="dc-form-label">Rol</label>

            <div className="dc-user-role-card-grid">
              {(Object.keys(roleMeta) as Role[]).map((role) => (
                <button
                  key={role}
                  className={`dc-user-role-card ${form.role === role ? 'active' : ''}`}
                  type="button"
                  onClick={() => setForm({ ...form, role })}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    {roleMeta[role].icon}
                  </span>
                  <strong>{roleMeta[role].label}</strong>
                  <span>{roleMeta[role].helper}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="dc-login-button"
            type="button"
            disabled={createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </Modal>

      <Modal
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title={`Actividad — ${selectedUser?.name ?? ''}`}
        width={720}
      >
        {activityLoading ? (
          <div className="dc-empty-state">Cargando actividad...</div>
        ) : (userActivity?.length ?? 0) === 0 ? (
          <div className="dc-empty-state">Sin actividad registrada</div>
        ) : (
          <div className="dc-activity-list">
            {userActivity!.map((log) => (
              <div className="dc-activity-item" key={log.id}>
                <div>
                  <div className="dc-activity-action">{log.action}</div>
                  <div className="dc-activity-meta">
                    {log.entity}
                    {log.entityId ? ` #${log.entityId}` : ''}
                  </div>
                </div>

                <span className="dc-activity-date">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="dc-form-label">{label}</label>
      <input
        className="dc-form-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
