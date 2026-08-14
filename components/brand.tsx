import { LogoMark } from "@/components/logo";

export function BrandMark({ size = 36 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={compact ? 26 : 30} />
      <span className="text-lg font-bold tracking-tight text-ink">DayMark</span>
    </span>
  );
}
