import { PortalLayout } from "@/components/PortalLayout";
import { AdminDashboard } from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <PortalLayout role="admin">
      <AdminDashboard />
    </PortalLayout>
  );
}
