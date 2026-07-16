import { Sidebar } from '@/components/dashboard/sidebar';
import { RouteGuard } from '@/components/dashboard/route-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      <div className="min-h-screen bg-slate-50/50">
        <Sidebar />
        <div className="lg:pl-72">
          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}
