import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Show, useClerk } from "@clerk/react";
import { CarFront, History, LogOut, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { Wordmark } from "@/components/bits";
import { CustomerSupport } from "@/components/customer-support";
import { useProfile } from "@/hooks/use-pablo";
import { basePath } from "@/lib/pablo";
import { cn } from "@/lib/utils";

function useNav() {
  const { data: profile } = useProfile();
  return [
    { href: "/book", label: profile?.role === "driver" ? "الطلبات" : "اطلب", icon: CarFront, id: "book" },
    { href: "/trips", label: "رحلاتي", icon: History, id: "trips" },
    { href: "/partner", label: "الشريك", icon: MessageCircle, id: "partner" },
    { href: "/account", label: "حسابي", icon: UserRound, id: "account" },
  ];
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const nav = useNav();
  const { data: profile } = useProfile();
  const { signOut } = useClerk();
  const active = (h: string) => loc === h || loc.startsWith(h + "/");
  return (
    <div className="min-h-[100dvh] pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-foreground/5 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" data-testid="link-home"><Wordmark /></Link>
          <Show when="signed-in">
            <nav className="hidden items-center gap-1 rounded-full bg-muted p-1 md:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} data-testid={`link-nav-${n.id}`}
                  className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-colors", active(n.href) ? "bg-[#10151d] text-[#ffd000]" : "text-foreground/70 hover:text-foreground")}>
                  {n.label}
                </Link>
              ))}
            </nav>
            {profile?.role === "customer" && <CustomerSupport />}
            <button data-testid="button-logout" onClick={() => signOut({ redirectUrl: basePath || "/" })} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">خروج</span>
            </button>
            <Link href="/owner" aria-label="إدارة بابلو" title="دخول المالك" data-testid="link-owner-admin" className="press inline-flex items-center gap-1.5 rounded-full border border-foreground/10 px-3 py-2 text-sm font-semibold hover:bg-foreground/5">
              <ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">الإدارة</span>
            </Link>
          </Show>
          <Show when="signed-out">
            <div className="flex items-center gap-2">
              <Link href="/owner/sign-in" data-testid="link-owner-signin" className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-foreground/5 hover:text-foreground">دخول المالك</Link>
              <Link href="/sign-in" data-testid="link-signin" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-foreground/5">دخول</Link>
              <Link href="/sign-up" data-testid="link-signup" className="press rounded-full bg-[#10151d] px-4 py-2 text-sm font-semibold text-[#ffd000]">حساب جديد</Link>
            </div>
          </Show>
        </div>
      </header>
      <main>{children}</main>
      <Show when="signed-in">
        <nav className={cn("fixed inset-x-3 bottom-3 z-40 grid rounded-[1.6rem] bg-[#10151d] p-1.5 shadow-[0_12px_40px_-10px_rgba(16,21,29,.6)] md:hidden", profile?.role === "customer" ? "grid-cols-5" : "grid-cols-4")}>
          {nav.map((n) => {
            const on = active(n.href);
            return (
              <Link key={n.href} href={n.href} data-testid={`link-tab-${n.id}`}
                className={cn("press flex flex-col items-center gap-0.5 rounded-[1.2rem] py-2 text-[11px] font-semibold transition-colors", on ? "bg-[#ffd000] text-[#10151d]" : "text-[#f6f1e4]/60")}>
                <n.icon className="h-5 w-5" /> {n.label}
              </Link>
            );
          })}
          {profile?.role === "customer" && <CustomerSupport placement="mobile-nav" />}
        </nav>
      </Show>
    </div>
  );
}
