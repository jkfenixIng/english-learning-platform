import { AppShell } from "../../../components/navigation/AppShell";
import { OnboardingDialog } from "../../../components/onboarding/OnboardingDialog";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <OnboardingDialog />
    </AppShell>
  );
}
