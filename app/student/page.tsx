import { PortalLayout } from "@/components/PortalLayout";
import { StudentPortal } from "@/components/StudentPortal";

export default function StudentPage() {
  return (
    <PortalLayout role="student">
      <StudentPortal />
    </PortalLayout>
  );
}
