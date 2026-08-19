"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/settings" ? pathname === "/settings" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
        active
          ? "border-ink bg-ink text-inverse-text dark:border-white dark:bg-white dark:text-inverse-text"
          : "border-border bg-surface text-ink hover:border-border-strong"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}