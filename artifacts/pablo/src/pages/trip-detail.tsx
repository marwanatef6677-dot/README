import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Phone, Star } from "lucide-react";
import { DriverShare, RideMap } from "@/components/ride-tracking";
import { useActOnRide } from "@workspace/api-client-react";
import type { Profile, RideActionAction } from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Btn, ErrorState, RouteLine, Skeleton, StatusPill, EmptyState } from "@/components/bits";
import { useInvalidateRides, useRide } from "@/hooks/use-pablo";
import { useToast } from "@/hooks/use-toast";
import { RIDE_TYPE_FALLBACK, STATUS_HINT, STEPS, errorText, fmtTime } from "@/lib/pablo";
import { cn } from "@/lib/utils";

const STEP_LABEL = ["الطلب", "قبول", "وصول", "في الطريق", "خلصت"];
const DONE_MSG: Partial<Record<RideActionAction, string>> = {
  accept: "قبلت الطلب", arrive: "سجّلنا إنك وصلت", start: "الرحلة بدأت", complete: "الرحلة خلصت", cancel: "الطلب اتلغى", rate: "شكراً على تقييمك",
};

export default function TripDetail({ profile }: { profile: Profile }) {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const ride = useRide(id);
  const act = useActOnRide();
  const invalidate = useInvalidateRides();
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [stars, setStars] = useState(0);
  const [err, setErr] = useState("");

  function run(action: RideActionAction, rating?: number) {
    setErr("");
    act.mutate({ id, data: rating ? { action, rating } : { action } }, {
      onSuccess: () => { invalidate(id); toast({ title: DONE_MSG[action] }); },
      onError: (e) => { invalidate(id); setErr(errorText(e)); },
    });
  }

  const back = <Link href="/trips" data-testid="link-back" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" /> رحلاتي</Link>;

  if (!Number.isFinite(id) || id <= 0) return <div className="mx-auto max-w-2xl px-4 py-8">{back}<div className="mt-6"><EmptyState title="رقم رحلة مش مظبوط" body="اللينك ده مش لرحلة موجودة." /></div></div>;
  if (ride.isLoading) return <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">{back}<Skeleton className="h-16" /><Skeleton className="h-64 rounded-[2rem]" /><Skeleton className="h-24" /></div>;
  if (ride.isError || !ride.data) return <div className="mx-auto max-w-2xl px-4 py-8">{back}<div className="mt-6"><ErrorState message={errorText(ride.error, "مش قادرين نجيب الرحلة دي.")} onRetry={() => ride.refetch()} /></div></div>;

  const r = ride.data;
  const isCustomer = r.customerId === profile.id;
  const isDriver = r.driverId === profile.id;
  const stepIdx = STEPS.indexOf(r.status);
  const pending = act.isPending;
  const variables = act.variables?.data.action;

  const driverNext: { action: RideActionAction; label: string } | null =
    isDriver ? (r.status === "accepted" ? { action: "arrive", label: "وصلت لنقطة الركوب" } : r.status === "arrived" ? { action: "start", label: "ابدأ الرحلة" } : r.status === "in_progress" ? { action: "complete", label: "خلّص الرحلة" } : null) : null;
  const canAccept = !isCustomer && !r.driverId && r.status === "pending" && profile.role === "driver";
  const canCancel = (isCustomer && ["pending", "accepted", "arrived"].includes(r.status)) || (isDriver && ["accepted", "arrived"].includes(r.status));
  const canRate = isCustomer && r.status === "completed" && r.rating == null;
  const other = isCustomer ? { title: "الكابتن", name: r.driverName, phone: r.driverPhone } : { title: "الراكب", name: r.customerName, phone: r.customerPhone };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {back}
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">رحلة <span className="font-num">#{r.id}</span></h1>
        <StatusPill status={r.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{fmtTime(r.createdAt)} · {r.province} · {RIDE_TYPE_FALLBACK[r.rideType]}</p>

      {r.status !== "cancelled" && (
        <div className="mt-6 flex items-center gap-1" data-testid="progress-ride">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div initial={false} animate={{ scaleX: i <= stepIdx ? 1 : 0 }} style={{ originX: 1 }} transition={{ duration: 0.5 }} className="h-full bg-[#10151d]" />
              </div>
              <p className={cn("mt-1.5 text-center text-[10px]", i <= stepIdx ? "font-semibold" : "text-muted-foreground")}>{STEP_LABEL[i]}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6"><RideMap ride={r} /></div>
      {isDriver && ["accepted", "arrived", "in_progress"].includes(r.status) && <div className="mt-4"><DriverShare key={r.id} rideId={r.id} /></div>}

      <div className="mt-4 rounded-[2rem] bg-[#10151d] p-6 text-[#f6f1e4]">
        <RouteLine from={r.pickup} to={r.destination} size="lg" />
        {r.notes && <p className="mt-4 rounded-xl bg-[#f6f1e4]/5 p-3 text-sm text-[#f6f1e4]/80">ملاحظة: {r.notes}</p>}
        <p className="mt-5 border-t border-dashed border-[#f6f1e4]/15 pt-4 text-sm text-[#f6f1e4]/70" data-testid="text-status-hint">{STATUS_HINT[r.status]}</p>
      </div>

      {(other.name && (isCustomer ? r.driverId : true)) && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-card-border bg-card p-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{other.title}</p>
            <p className="truncate font-display font-bold" data-testid="text-counterpart">{other.name}</p>
            {isCustomer && r.vehicle && <p className="text-sm text-muted-foreground">{r.vehicle} · <span className="font-num">{r.plate}</span></p>}
          </div>
          {other.phone && <a href={`tel:${other.phone}`} data-testid="link-call" className="press inline-flex items-center gap-2 rounded-full bg-[#ffd000] px-4 py-2 text-sm font-bold text-[#10151d]"><Phone className="h-4 w-4" /> <span className="font-num">{other.phone}</span></a>}
        </div>
      )}
      {isCustomer && r.status === "pending" && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-foreground/20 p-4 text-sm text-muted-foreground">
          <span className="relative flex h-3 w-3"><span className="pulse-ring absolute inset-0 rounded-full bg-[#ffd000]" /><span className="relative h-3 w-3 rounded-full bg-[#ffd000]" /></span>
          مستنيين كابتن تجربة في {r.province} يقبل الطلب. ممكن ياخد وقت أو محدش يقبله.
        </div>
      )}

      {err && <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" data-testid="text-action-error">{err}</p>}

      <div className="mt-6 space-y-3">
        {canAccept && <Btn variant="yellow" className="h-14 w-full" data-testid="button-accept" disabled={pending} onClick={() => run("accept")}>{pending && variables === "accept" && <Loader2 className="h-5 w-5 animate-spin" />} اقبل الطلب</Btn>}
        {driverNext && <Btn variant="yellow" className="h-14 w-full" data-testid={`button-${driverNext.action}`} disabled={pending} onClick={() => run(driverNext.action)}>{pending && variables === driverNext.action ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} {driverNext.label}</Btn>}
        {canRate && (
          <div className="rounded-2xl border border-card-border bg-card p-5 text-center">
            <p className="font-display font-bold">إيه رأيك في الرحلة؟</p>
            <div className="mt-3 flex justify-center gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} data-testid={`button-star-${n}`} onClick={() => setStars(n)} className="press p-1" aria-label={`${n}`}>
                  <Star className={cn("h-8 w-8 transition-colors", n <= stars ? "fill-[#ffd000] text-[#10151d]" : "text-foreground/25")} />
                </button>
              ))}
            </div>
            <Btn className="mt-4 w-full" data-testid="button-rate" disabled={!stars || pending} onClick={() => run("rate", stars)}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} ابعت التقييم</Btn>
          </div>
        )}
        {r.rating != null && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-muted p-4 text-sm" data-testid="text-rating">
            التقييم: <span className="flex" dir="ltr">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("h-4 w-4", n <= (r.rating ?? 0) ? "fill-[#ffd000] text-[#10151d]" : "text-foreground/20")} />)}</span>
          </div>
        )}
        {canCancel && <Btn variant="danger" className="w-full" data-testid="button-cancel" disabled={pending} onClick={() => setConfirmCancel(true)}>إلغاء الطلب</Btn>}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent dir="rtl" className="rounded-3xl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="font-display">تلغي الطلب؟</AlertDialogTitle>
            <AlertDialogDescription>{isDriver ? "الراكب هيتبلغ إن الرحلة اتلغت." : "لو في كابتن جاي لك هيتبلغ بالإلغاء."} الخطوة دي مش هينفع ترجع فيها.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction data-testid="button-confirm-cancel" className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => run("cancel")}>أيوه، الغيه</AlertDialogAction>
            <AlertDialogCancel data-testid="button-keep" className="rounded-xl">لا، خليه</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
