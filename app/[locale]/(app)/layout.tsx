import { AppShell } from "../../../components/navigation/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
