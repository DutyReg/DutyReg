"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CheckIcon, GearIcon, ListIcon } from "@/components/icons";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: "list" | "check" | "gear";
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: "list" },
  { href: "/attendance", label: "Mark", icon: "check", ownerOnly: false },
  { href: "/settings", label: "Settings", icon: "gear", ownerOnly: true },
];

const ICONS = {
  list: ListIcon,
  check: CheckIcon,
  gear: GearIcon,
};

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || role === "owner");

  return (
    <nav className="contents" aria-label="Main">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 text-[11px] font-semibold transition-colors
              ${active ? "text-ink" : "text-muted hover:text-ink-soft"}`}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                active ? "bg-primary/25 text-primary-ink" : ""
              }`}
            >
              <Icon size={22} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ role }: { role: Role }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg">
        <NavLinks role={role} />
      </div>
    </nav>
  );
}

export function TopNav({ role }: { role: Role }) {
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      <NavLinks role={role} />
    </nav>
  );
}