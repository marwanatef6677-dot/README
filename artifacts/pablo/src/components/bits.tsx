import type { ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { AlertTriangle, Bike, ChevronLeft, FlaskConical, Package, RotateCw } from "lucide-react";
import type { Ride, RideStatus } from "@workspace/api-client-react";
import { STATUS_LABEL, RIDE_TYPE_FALLBACK, relTime } from "@/lib/pablo";
import { cn } from "@/lib/utils";

export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={cn("h-10 w-10", className)} aria-hidden>
      <rect width="96" height="96" rx="26" fill="#10151d" />
      <path d="M34 74V40a16 16 0 0 1 16-16h2a16 16 0 0 1 0 32H44" fill="none" stroke="#ffd000" strokeWidth="12" strokeLinecap="round" />
      <path d="M34 70V41a16 16 0 0 1 16-16h2a15 15 0 0 1 0 30H45" fill="none" stroke="#10151d" strokeWidth="1.6" strokeDasharray="4 4" />
      <circle cx="64" cy="70" r="5" fill="#ffd000" />
    </svg>
  );
}

export function Wordmark({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Monogram className="h-9 w-9" />
      <span className="leading-none">
        <span className={cn("font-display text-xl font-black", light ? "text-[#f6f1e4]" : "text-[#10151d]")}>بابلو</span>
        <span className={cn("block font-num text-[10px] tracking-[0.3em]", light ? "text-[#ffd000]" : "text-muted-foreground")}>PABLO</span>
      </span>
    </span>
  );
}

export function PilotNotice({ text, compact }: { text?: string; compact?: boolean }) {
  return (
    <div data-testid="notice-pilot" className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed border-[#10151d]/25 bg-[#ffd000]/15", compact ? "p-3" : "p-4")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#10151d] text-[#ffd000]"><FlaskConical className="h-4 w-4" /></span>
        <div className="text-sm leading-relaxed">
          <p className="font-display font-bold">نسخة تجريبية</p>
          <p className="text-foreground/75">{text || "كل الطلبات هنا طلبات تجربة. لسه مفيش كباتن متحقق منهم، ولا دفع، ولا خرايط أو حساب مسافات. اتفق مع الكابتن مباشرة."}</p>
        </div>
      </div>
    </div>
  );
}

const pillTone: Record<RideStatus, string> = {
  pending: "bg-[#ffd000] text-[#10151d]",
  accepted: "bg-[#10151d] text-[#ffd000]",
  arrived: "bg-[#10151d] text-[#ffd000]",
  in_progress: "bg-[hsl(168_45%_36%)] text-white",
  completed: "bg-muted text-foreground",
  cancelled: "bg-transparent text-muted-foreground border border-dashed border-muted-foreground/40",
};
export function StatusPill({ status }: { status: RideStatus }) {
  const live = status === "pending" || status === "accepted" || status === "arrived" || status === "in_progress";
  return (
    <span data-testid={`status-ride-${status}`} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", pillTone[status])}>
      {live && <span className="relative flex h-1.5 w-1.5"><span className="pulse-ring absolute inset-0 rounded-full bg-current" /><span className="relative h-1.5 w-1.5 rounded-full bg-current" /></span>}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RouteLine({ from, to, size = "md" }: { from: string; to: string; size?: "md" | "lg" }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <span className="h-3 w-3 rounded-full border-[3px] border-[#10151d] bg-[#ffd000]" />
        <span className="my-1 w-0.5 flex-1 bg-[repeating-linear-gradient(180deg,hsl(var(--foreground)/.35)_0_4px,transparent_4px_8px)]" />
        <span className="h-3 w-3 rounded-[3px] bg-[#10151d]" />
      </div>
      <div className={cn("min-w-0 flex-1 space-y-3", size === "lg" && "space-y-5")}>
        <div><p className="text-[11px] text-muted-foreground">من</p><p className={cn("truncate font-semibold", size === "lg" && "text-lg")}>{from}</p></div>
        <div><p className="text-[11px] text-muted-foreground">إلى</p><p className={cn("truncate font-semibold", size === "lg" && "text-lg")}>{to}</p></div>
      </div>
    </div>
  );
}

export function RideCard({ ride, i = 0, action }: { ride: Ride; i?: number; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}
      className="group relative rounded-3xl border border-card-border bg-card p-4 shadow-[0_1px_0_hsl(var(--foreground)/.04)] transition-transform hover:-translate-y-0.5" data-testid={`card-ride-${ride.id}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <StatusPill status={ride.status} />
        <span className="text-xs text-muted-foreground">{relTime(ride.createdAt)}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2" data-testid={`badges-ride-service-${ride.id}`}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10151d] px-2.5 py-1 text-[11px] font-bold text-[#ffd000]">
          {ride.serviceType === "delivery" ? <Package className="h-3.5 w-3.5" /> : ride.rideType === "motorcycle" ? <Bike className="h-3.5 w-3.5" /> : null}
          {ride.serviceType === "delivery" ? "توصيل طلب · موتوسيكل" : ride.rideType === "motorcycle" ? "مشوار راكب · موتوسيكل" : `مشوار راكب · ${RIDE_TYPE_FALLBACK[ride.rideType]}`}
        </span>
      </div>
      <RouteLine from={ride.pickup} to={ride.destination} />
      {ride.serviceType === "delivery" && ride.deliveryDescription && <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs leading-5" data-testid={`text-delivery-description-${ride.id}`}>الطلب: {ride.deliveryDescription}</p>}
      {ride.serviceType === "delivery" && (ride.recipientName || ride.recipientPhone) && <p className="mt-2 text-xs text-muted-foreground" data-testid={`text-delivery-recipient-${ride.id}`}>{ride.recipientName ? `المستلم: ${ride.recipientName}` : ""}{ride.recipientName && ride.recipientPhone ? " · " : ""}{ride.recipientPhone ? `موبايل: ${ride.recipientPhone}` : ""}</p>}
      {ride.farePiasters != null && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#ffd000]/15 px-3 py-2" data-testid={`ride-fare-${ride.id}`}>
          <span className="text-xs text-muted-foreground">السعر المعروض للكابتن</span>
          <strong className="font-num text-sm font-black text-foreground">{(ride.farePiasters / 100).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} جنيه</strong>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
        <span>{ride.province} · {RIDE_TYPE_FALLBACK[ride.rideType]} · <span className="font-num">#{ride.id}</span></span>
        {action ?? (
          <Link href={`/trips/${ride.id}`} data-testid={`link-ride-${ride.id}`} className="press inline-flex items-center gap-1 font-semibold text-foreground after:absolute after:inset-0">
            التفاصيل <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}
export function ListSkeleton({ n = 3 }: { n?: number }) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>;
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div data-testid="state-empty" className="relative overflow-hidden rounded-3xl border border-dashed border-foreground/20 px-6 py-12 text-center">
      <div className="mx-auto mb-5 h-2 w-40 overflow-hidden rounded-full"><div className="road-stripes animate-drive h-full w-[200%] opacity-70" /></div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div data-testid="state-error" className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
      <p className="mt-3 font-semibold">{message}</p>
      {onRetry && (
        <button data-testid="button-retry" onClick={onRetry} className="press mt-4 inline-flex items-center gap-2 rounded-full bg-[#10151d] px-4 py-2 text-sm font-semibold text-[#ffd000]">
          <RotateCw className="h-4 w-4" /> جرّب تاني
        </button>
      )}
    </div>
  );
}

export function Btn({ variant = "dark", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "dark" | "yellow" | "ghost" | "danger" }) {
  const v = {
    dark: "bg-[#10151d] text-[#ffd000] hover:bg-[#1a2230]",
    yellow: "bg-[#ffd000] text-[#10151d] hover:bg-[#ffdb33] shadow-[0_6px_0_#10151d] active:shadow-[0_2px_0_#10151d] active:translate-y-1",
    ghost: "border border-foreground/15 bg-transparent hover:bg-foreground/5",
    danger: "border border-destructive/40 text-destructive hover:bg-destructive/10",
  }[variant];
  return <button {...p} className={cn("press inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-display font-bold transition-all disabled:pointer-events-none disabled:opacity-50", v, className)} />;
}
