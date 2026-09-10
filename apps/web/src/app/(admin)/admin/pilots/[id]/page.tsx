import { AdminPilotDeskPage } from "@/components/admin/pilot-desk-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPilotDeskPage id={id} />;
}
