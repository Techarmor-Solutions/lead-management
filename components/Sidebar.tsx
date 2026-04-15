"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Building2,
  Users,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  ListChecks,
  Kanban,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead Discovery", icon: Search },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/deals", label: "Deals", icon: Kanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-[240px] flex-shrink-0 bg-[#111c22] border-r border-[#1e3040] flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[#1e3040]">
        <Image
          src="/white-ta-logo.png"
          alt="TechArmor Solutions"
          width={160}
          height={48}
          className="object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-[#eb9447]/15 text-[#eb9447]"
                  : "text-zinc-400 hover:text-white hover:bg-[#1e3040]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-[#1e3040] space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-[#eb9447]/15 text-[#eb9447]"
              : "text-zinc-400 hover:text-white hover:bg-[#1e3040]"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-[#1e3040] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
