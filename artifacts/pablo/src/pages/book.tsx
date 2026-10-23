import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import { useActOnRide } from "@workspace/api-client-react";
import type { Profile, Ride } from "@workspace/api-client-react";
import { BookingForm } from "@/components/booking-form";
import { EmptyState, ErrorState, ListSkeleton, PilotNotice, RideCard, RouteLine, StatusPill } from "@/components/bits";
import { useConfig, useInvalidateRides, useMyRides, useQueue, useSummary } from "@/hooks/use-pablo";
import { useToast } from "@/hooks/use-toast";
import { ACTIVE, STATUS_HINT, errorText } from "@/lib/pablo";

function ActiveBanner({ ride }: { ride: Ride }) {
  return (
    <Link href={`/trips/${ride.id}`} data-testid="link-active-ride" className="press group block rounded-[2rem] bg-[#10151d] p-5 text-[#f6f1e4]">
      <div className="flex items-center justify-between"><StatusPill status={ride.status} /><span className="font-num text-xs text-[#f6f1e4]/50">#{ride.id}</span></div>
      <div className="mt-4"><RouteLine from={ride.pickup} to={ride.destination} /></div>
      <p className="mt-4 text-sm text-[#f6f1e4]/70">{STATUS_HINT[ride.status]}</p>
      <span className="mt-4 inline-flex items-center gap-2 font-display font-bold text-[#ffd000]">تابع الرحلة <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /></span>
    </Link>
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

function CustomerBook({ profile }: { profile: Profile }) {
  const rides = useMyRides();
  const config = useConfig();
  const active = rides.data?.find((r) => ACTIVE.includes(r.status));
  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <h1 className="font-display text-3xl font-black">أهلاً {profile.name.split(" ")[0]}، <span className="text-muted-foreground">رايح فين؟</span></h1>
        <div className="mt-6">
          {rides.isLoading ? <ListSkeleton n={1} /> : active ? (
            <div className="space-y-3"><p className="text-sm text-muted-foreground">عندك رحلة شغالة. مينفعش تطلب رحلة تانية غير لما دي تخلص أو تتلغي.</p><ActiveBanner ride={active} /></div>
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
  const queue = useQueue(true);
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
          {myJob && <><p className="text-sm text-muted-foreground">عندك رحلة شغالة. خلّصها الأول قبل ما تقبل طلب جديد.</p><ActiveBanner ride={myJob} /></>}
          {queue.isLoading ? <ListSkeleton /> : queue.isError ? <ErrorState message={errorText(queue.error)} onRetry={() => queue.refetch()} /> :
            !queue.data?.length ? (
              <EmptyState title="مفيش طلبات دلوقتي" body={`أول ما راكب في ${profile.province} يطلب مشوار هيظهر هنا. خلّي الصفحة مفتوحة.`} />
            ) : queue.data.map((r, i) => (
              <RideCard key={r.id} ride={r} i={i} action={
                <button data-testid={`button-accept-${r.id}`} disabled={!!myJob || busy !== null} onClick={() => accept(r.id)}
                  className="press relative z-10 inline-flex items-center gap-1.5 rounded-full bg-[#ffd000] px-4 py-2 font-display text-sm font-bold text-[#10151d] disabled:opacity-40">
                  {busy === r.id && <Loader2 className="h-4 w-4 animate-spin" />} اقبل
                </button>
              } />
            ))}
        </div>
      </div>
      <aside className="space-y-4">
        <Stats />
        <div className="rounded-2xl border border-card-border bg-card p-4 text-sm">
          <p className="font-display font-bold">عربيتك</p>
          <p className="mt-1">{profile.vehicle} · <span className="font-num">{profile.plate}</span></p>
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
