import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f2ed' }}>
      <Sidebar />
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} />
        <main style={{ flex: 1, padding: 28 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
