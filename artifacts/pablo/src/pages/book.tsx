import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, BadgeCheck, Loader2, Radio, Star, Trophy } from "lucide-react";
import { useActOnRide } from "@workspace/api-client-react";
import type { Profile, Ride } from "@workspace/api-client-react";
import { BookingForm } from "@/components/booking-form";
import { EmptyState, ErrorState, ListSkeleton, PilotNotice, RideCard, RouteLine, StatusPill } from "@/components/bits";
import { useConfig, useInvalidateRides, useMyRides, useQueue, useSummary } from "@/hooks/use-pablo";
import { useToast } from "@/hooks/use-toast";
import { ACTIVE, STATUS_HINT, errorText } from "@/lib/pablo";
import { RideMap } from "@/components/ride-tracking";

function ActiveBanner({ ride, viewer }: { ride: Ride; viewer: "customer" | "driver" }) {
  return (
    <section className="rounded-[2rem] border border-card-border bg-card p-4 shadow-sm sm:p-5" data-testid="panel-active-ride">
      <Link href={`/trips/${ride.id}`} data-testid="link-active-ride" className="press group block rounded-2xl bg-[#10151d] p-4 text-[#f6f1e4]">
        <div className="flex items-center justify-between"><StatusPill status={ride.status} /><span className="font-num text-xs text-[#f6f1e4]/50">#{ride.id}</span></div>
        <div className="mt-4"><RouteLine from={ride.pickup} to={ride.destination} /></div>
        <p className="mt-4 text-sm text-[#f6f1e4]/70">{STATUS_HINT[ride.status]}</p>
        <span className="mt-4 inline-flex items-center gap-2 font-display font-bold text-[#ffd000]">تابع الرحلة <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /></span>
      </Link>
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold">{viewer === "customer" ? "خريطة رحلتك وموقع الكابتن" : "خريطة الرحلة"}</p>
        <RideMap ride={ride} />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {viewer === "customer"
            ? "موقع الكابتن يظهر بعد قبول الطلب وموافقته على مشاركة موقعه أثناء الرحلة."
            : "من تفاصيل الرحلة تقدر تبدأ مشاركة موقعك مع الراكب بعد السماح للموقع على جهازك."}
        </p>
      </div>
    </section>
  );
}

function Stats() {
  const s = useSummary();
  const items = [["كل الرحلات", s.data?.total], ["خلصت", s.data?.completed], ["شغالة", s.data?.active], ["اتلغت", s.data?.cancelled]] as const;
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-card-border bg-card" data-testid="summary">
      {items.map(([l, v]) => (
        <div key={l} className="border-l border-border p-3 text-center last:border-l-0">
          <p className="font-num text-xl font-bold">{s.isLoading ? "–" : (v ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">{l}</p>
        </div>
      ))}
    </div>
  );
}

function DriverProgress({ profile }: { profile: Profile }) {
  const progress = profile.driverLevel >= 10 ? 100 : ((profile.driverCompletedRides % 10) / 10) * 100;
  return (
    <section className="rounded-2xl border border-card-border bg-card p-4" data-testid="driver-progress">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">مستواك الحالي</p>
          <p className="mt-1 flex items-center gap-2 font-display text-2xl font-black">
            <Trophy className="h-5 w-5 text-[#9b7600]" /> Level {profile.driverLevel}
          </p>
        </div>
        <div className="rounded-xl bg-[#ffd000]/20 px-3 py-2 text-center">
          <p className="flex items-center justify-center gap-1 font-num font-bold">
            <Star className="h-4 w-4 fill-[#ffd000] text-[#9b7600]" />
            {profile.driverRating == null ? "—" : profile.driverRating.toFixed(1)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">تقييم الركاب</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-full rounded-full bg-[#ffd000] transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{profile.driverCompletedRides.toLocaleString("ar-EG")} رحلة مكتملة</span>
        <span>{profile.driverLevel >= 10 ? "وصلت لأعلى Level" : `باقي ${profile.ridesToNextLevel.toLocaleString("ar-EG")} رحلات للمستوى التالي`}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">كل ١٠ رحلات مكتملة ترفعك Level، والتقييم متوسط آراء الركاب.</p>
      <div className="mt-3 rounded-xl border border-[#ffd000]/40 bg-[#ffd000]/10 p-3" data-testid="driver-level-rewards">
        <p className="flex items-center gap-2 text-xs font-bold"><BadgeCheck className="h-4 w-4 text-[#9b7600]" /> شارات المستويات المفتوحة</p>
        {profile.driverLevel === 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">أكمل ١٠ رحلات لفتح أول شارة Level.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: profile.driverLevel }, (_, index) => (
              <span key={index + 1} className="rounded-full bg-[#10151d] px-2.5 py-1 font-num text-[10px] font-bold text-[#ffd000]">Level {index + 1}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CustomerBook({ profile }: { profile: Profile }) {
  const rides = useMyRides();
  const config = useConfig();
  const active = rides.data?.find((r) => ACTIVE.includes(r.status));
  const newCustomer = !rides.isLoading && (rides.data?.length ?? 0) === 0;
  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <h1 className="font-display text-3xl font-black">أهلاً {profile.name.split(" ")[0]}، <span className="text-muted-foreground">رايح فين؟</span></h1>
        {newCustomer && (
          <div className="mt-4 rounded-3xl border border-[#ffd000]/45 bg-[#ffd000]/15 p-4 sm:p-5" data-testid="welcome-new-customer">
            <p className="font-display text-lg font-bold">نورت بابلو، يا {profile.name.split(" ")[0]}.</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/75">أول مشوار يبدأ من الخريطة: اختار نقطة الركوب، وبعدها حدّد المكان اللي رايح له. هنحسب لك الطريق ونبعت طلبك لكباتن محافظتك.</p>
          </div>
        )}
        <div className="mt-6">
          {rides.isLoading ? <ListSkeleton n={1} /> : active ? (
            <div className="space-y-3"><p className="text-sm text-muted-foreground">عندك رحلة شغالة. مينفعش تطلب رحلة تانية غير لما دي تخلص أو تتلغي.</p><ActiveBanner ride={active} viewer="customer" /></div>
          ) : <BookingForm signedIn defaultProvince={profile.province} />}
        </div>
      </div>
      <aside className="space-y-4">
        <Stats />
        <PilotNotice text={config.data?.notice} compact />
      </aside>
    </div>
  );
}

function DriverBook({ profile }: { profile: Profile }) {
  const documentsReady = profile.hasDriverLicenseFront && profile.hasDriverLicenseBack
    && profile.hasVehicleLicenseFront && profile.hasVehicleLicenseBack;
  const approvedToAccept = profile.driverReviewStatus === "approved" && profile.driverTermsAccepted
    && documentsReady && profile.hasCaptainVehiclePhoto && profile.captainPhotoVerified;
  const queue = useQueue(approvedToAccept);
  const rides = useMyRides();
  const act = useActOnRide();
  const invalidate = useInvalidateRides();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState<number | null>(null);
  const myJob = rides.data?.find((r) => ACTIVE.includes(r.status));

  function accept(id: number) {
    setBusy(id);
    act.mutate({ id, data: { action: "accept" } }, {
      onSuccess: (r) => { invalidate(r.id); toast({ title: "قبلت الطلب", description: "روح لنقطة الركوب وحدّث الحالة لما توصل." }); setLocation(`/trips/${r.id}`); },
      onError: (e) => { invalidate(id); toast({ title: "مقدرناش نقبل الطلب", description: errorText(e), variant: "destructive" }); },
      onSettled: () => setBusy(null),
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black">طلبات {profile.province}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Radio className="h-3.5 w-3.5 text-[hsl(168_45%_36%)]" /> بتتحدث لوحدها كل ٥ ثواني</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {myJob && <><p className="text-sm text-muted-foreground">عندك رحلة شغالة. خلّصها الأول قبل ما تقبل طلب جديد.</p><ActiveBanner ride={myJob} viewer="driver" /></>}
          {!approvedToAccept ? <div className="rounded-2xl border border-amber-800/20 bg-[#ffd000]/15 p-4 text-sm leading-relaxed text-[#665000]" data-testid="notice-driver-awaiting-approval">
            <p className="font-display font-bold">قبول الطلبات مقفول مؤقتًا</p>
            <p className="mt-1">لازم ترفع صور وجهي الرخصتين، وتكمل الإقرار، وتنتظر مراجعة واعتماد الإدارة قبل ما تشوف طلبات الرحلات أو تقبلها.</p>
            <Link href="/account" data-testid="link-driver-approval-account" className="mt-2 inline-block font-bold underline">راجع بيانات ومستندات الكابتن</Link>
          </div> : queue.isLoading ? <ListSkeleton /> : queue.isError ? <ErrorState message={errorText(queue.error)} onRetry={() => queue.refetch()} /> :
            !queue.data?.length ? (
              <EmptyState title="مفيش طلبات دلوقتي" body={`أول ما راكب في ${profile.province} يطلب مشوار هيظهر هنا. خلّي الصفحة مفتوحة.`} />
             ) : queue.data.filter((request) => profile.vehicleType === "motorcycle"
               ? request.rideType === "motorcycle"
               : request.serviceType === "passenger" && request.rideType !== "motorcycle").map((r, i) => (
              <RideCard key={r.id} ride={r} i={i} viewerRole="driver" action={
                  <button data-testid={`button-accept-${r.id}`} disabled={!approvedToAccept || !!myJob || busy !== null} onClick={() => accept(r.id)}
                  className="press relative z-10 inline-flex items-center gap-1.5 rounded-full bg-[#ffd000] px-4 py-2 font-display text-sm font-bold text-[#10151d] disabled:opacity-40">
                  {busy === r.id && <Loader2 className="h-4 w-4 animate-spin" />} اقبل
                </button>
              } />
            ))}
        </div>
      </div>
      <aside className="space-y-4">
        <DriverProgress profile={profile} />
        <Stats />
        <div className="rounded-2xl border border-card-border bg-card p-4 text-sm">
          <p className="font-display font-bold">عربيتك</p>
           <p className="mt-1">{profile.vehicleType === "motorcycle" ? "موتوسيكل" : "عربية"} · {profile.vehicle} · <span className="font-num">{profile.plate}</span></p>
          <Link href="/account" data-testid="link-edit-vehicle" className="mt-2 inline-block text-xs underline">تعديل</Link>
        </div>
        <PilotNotice compact text="طلبات تجربة بس. اتفق على الأجرة مع الراكب مباشرة، ومفيش دفع من خلال التطبيق." />
      </aside>
    </div>
  );
}

export default function Book({ profile }: { profile: Profile }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {profile.role === "driver" ? <DriverBook profile={profile} /> : <CustomerBook profile={profile} />}
    </div>
  );
}
