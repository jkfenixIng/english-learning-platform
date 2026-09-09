import { isCurrentUserAdmin } from "@/lib/auth/requireAdmin";
import { AppShellClient } from "./AppShellClient";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  try {
    isAdmin = await isCurrentUserAdmin();
  } catch {
    isAdmin = false;
  }
  return <AppShellClient isAdmin={isAdmin}>{children}</AppShellClient>;
}
