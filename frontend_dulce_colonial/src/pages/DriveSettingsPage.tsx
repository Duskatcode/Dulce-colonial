import AppLayout from '../components/layout/AppLayout';
import DriveSettingsPanel from '../components/drive/DriveSettingsPanel';

export default function DriveSettingsPage() {
  return (
    <AppLayout title="Configuración de Google Drive">
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>
          Configuración de Google Drive
        </h1>
        <DriveSettingsPanel />
      </div>
    </AppLayout>
  );
}
