import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { usersService } from '../services/users.service';
import { activityService } from '../services/activity.service';
import { User } from '../types';

const emptyForm = { name: '', email: '', password: '', role: 'OPERADOR' };

export default function UsersPage() {
  const qc = useQueryClient();
  const [modalOpen,    setModalOpen]    = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form,         setForm]         = useState(emptyForm);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  usersService.getAll,
  });

  const { data: userActivity } = useQuery({
    queryKey: ['activity-user', selectedUser?.id],
    queryFn:  () => activityService.getByUser(selectedUser!.id),
    enabled:  !!selectedUser && activityOpen,
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado');
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear'),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario desactivado');
    },
  });

  const openActivity = (user: User) => {
    setSelectedUser(user);
    setActivityOpen(true);
  };

  const columns = [
    { key: 'name',      label: 'Nombre'  },
    { key: 'email',     label: 'Correo'  },
    { key: 'role',      label: 'Rol',      render: (r: User) => <Badge label={r.role} />     },
    { key: 'isActive',  label: 'Estado',   render: (r: User) => (
      <Badge label={r.isActive ? 'ACTIVO' : 'INACTIVO'} />
    )},
    { key: 'createdAt', label: 'Creado',   render: (r: User) =>
      new Date(r.createdAt).toLocaleDateString('es-CO')
    },
    { key: 'actions',   label: '',         render: (r: User) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => openActivity(r)} style={btnStyle('#3d1a00')}>
          Actividad
        </button>
        {r.isActive && (
          <button onClick={() => deactivateMutation.mutate(r.id)} style={btnStyle('#c0392b')}>
            Desactivar
          </button>
        )}
      </div>
    )},
  ];

  return (
    <AppLayout title="Usuarios">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => setModalOpen(true)}
          style={{ padding: '9px 20px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          + Nuevo usuario
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <Table columns={columns} data={users || []} loading={isLoading} emptyMessage="No hay usuarios" />
      </div>

      {/* Modal crear usuario */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nombre completo" value={form.name}     onChange={(v: string) => setForm({ ...form, name: v })} />
          <Field label="Correo"          value={form.email}    onChange={(v: string) => setForm({ ...form, email: v })}    type="email" />
          <Field label="Contraseña"      value={form.password} onChange={(v: string) => setForm({ ...form, password: v })} type="password" />
          <div>
            <label style={labelStyle}>Rol</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERADOR">OPERADOR</option>
              <option value="VISOR">VISOR</option>
            </select>
          </div>
          <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
            style={{ padding: '11px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
            {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </Modal>

      {/* Modal actividad del usuario */}
      <Modal open={activityOpen} onClose={() => setActivityOpen(false)}
        title={`Actividad — ${selectedUser?.name}`} width={600}>
        <div>
          {!userActivity ? (
            <p style={{ color: '#aaa', textAlign: 'center' }}>Cargando...</p>
          ) : userActivity.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center' }}>Sin actividad registrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {userActivity.map((log: any) => (
                <div key={log.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: '#faf5f0', borderRadius: 8, fontSize: 13,
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#1a0a00' }}>{log.action}</span>
                    <span style={{ color: '#888', marginLeft: 8 }}>{log.entity}</span>
                    {log.entityId && (
                      <span style={{ color: '#bbb', marginLeft: 4 }}>#{log.entityId}</span>
                    )}
                  </div>
                  <span style={{ color: '#aaa', fontSize: 12 }}>
                    {new Date(log.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}

const Field = ({ label, value, onChange, type = 'text' }: any) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
  </div>
);

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, color: '#555', marginBottom: 4, fontWeight: 500 };
const inputStyle:  React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0d5cc', fontSize: 14, boxSizing: 'border-box' };
const btnStyle = (bg: string): React.CSSProperties => ({ padding: '5px 12px', background: bg, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 });