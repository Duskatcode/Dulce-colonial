import DriveSettingsPanel from '../components/drive/DriveSettingsPanel';
import AppLayout from '../components/layout/AppLayout';

export default function DriveSettingsPage() {
  return (
    <AppLayout title="Google Drive">
      <div className="dc-drive-layout">
        <section className="dc-page-header">
          <div>
            <p className="dc-page-eyebrow">Respaldos y reportes</p>
            <h1 className="dc-page-title">Google Drive</h1>
            <p className="dc-page-subtitle">
              Autoriza Google Drive para subir reportes automáticos, respaldos manuales y archivos operativos.
            </p>
          </div>
        </section>

        <div className="dc-drive-grid">
          <section className="dc-drive-hero">
            <span className="dc-drive-hero-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 34 }}>
                cloud_sync
              </span>
            </span>

            <h2 className="dc-drive-card-title">Flujo de integración</h2>
            <p className="dc-drive-description" style={{ marginTop: 10 }}>
              La conexión usa OAuth de Google. Cuando esté activa, los reportes generados desde
              Caja y Reportes podrán guardarse en las carpetas configuradas de Drive.
            </p>

            <div className="dc-drive-steps">
              <Step icon="login" title="1. Autorizar" text="Se abre Google para aprobar acceso a Drive." />
              <Step icon="verified_user" title="2. Guardar token" text="El backend conserva el token localmente para futuras subidas." />
              <Step icon="upload_file" title="3. Subir reportes" text="Los reportes diarios, semanales y manuales se guardan automáticamente." />
            </div>
          </section>

          <DriveSettingsPanel />
        </div>
      </div>
    </AppLayout>
  );
}

function Step({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="dc-drive-step">
      <span className="dc-drive-step-icon">
        <span className="material-symbols-outlined" style={{ fontSize: 21 }}>
          {icon}
        </span>
      </span>

      <div>
        <div className="dc-drive-step-title">{title}</div>
        <div className="dc-drive-step-text">{text}</div>
      </div>
    </div>
  );
}
