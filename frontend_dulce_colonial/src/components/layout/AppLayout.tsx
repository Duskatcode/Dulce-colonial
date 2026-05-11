import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <div className="dc-app-shell">
      <Sidebar />

      <div className="dc-app-main">
        <Topbar title={title} />
        <main className="dc-page-canvas">{children}</main>
      </div>
    </div>
  );
}
