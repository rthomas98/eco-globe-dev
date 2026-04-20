import { SettingsLayout } from "@/components/admin/settings-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
