import { redirectIfSignedIn } from "@/lib/auth";
import { needsConfiguration } from "@/lib/env";
import { BrandMark } from "@/components/brand";
import { Card } from "@/components/ui";
import { ConfigNeeded } from "@/components/config-needed";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectIfSignedIn();

  const { error } = await searchParams;
  const configNeeded = needsConfiguration();

  if (configNeeded) return <ConfigNeeded />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="grid justify-items-center gap-3 text-center">
        <BrandMark />
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">DayMark</h1>
          <p className="max-w-[30ch] text-sm text-muted">
            Attendance logging for small businesses. Mark the day, see it instantly.
          </p>
        </div>
      </div>

      <Card className="w-full max-w-sm px-5 py-6">
        <AuthPanel oauthError={error === "auth" ? "Google sign-in did not complete. Try again." : null} />
      </Card>
    </main>
  );
}