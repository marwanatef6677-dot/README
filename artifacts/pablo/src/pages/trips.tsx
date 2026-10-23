import { useMemo, useState } from "react";
import { Link } from "wouter";
import type { Profile } from "@workspace/api-client-react";
import { EmptyState, ErrorState, ListSkeleton, RideCard } from "@/components/bits";
import { useMyRides } from "@/hooks/use-pablo";
import { ACTIVE, errorText } from "@/lib/pablo";
import { cn } from "@/lib/utils";
import { RideMap } from "@/components/ride-tracking";

const tabs = [["all", "الكل"], ["active", "شغالة"], ["completed", "خلصت"], ["cancelled", "اتلغت"]] as const;

export default function Trips({ profile }: { profile: Profile }) {
  const rides = useMyRides();
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("all");
  const list = useMemo(() => (rides.data ?? []).filter((r) =>
    tab === "all" ? true : tab === "active" ? ACTIVE.includes(r.status) : r.status === tab), [rides.data, tab]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-black">رحلاتي</h1>
      <p className="mt-1 text-sm text-muted-foreground">{profile.role === "driver" ? "الرحلات اللي قبلتها ككابتن، واللي طلبتها لنفسك." : "كل المشاوير اللي طلبتها."}</p>
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-muted p-1">
        {tabs.map(([k, l]) => (
          <button key={k} data-testid={`button-tab-${k}`} onClick={() => setTab(k)} className={cn("press flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors", tab === k ? "bg-[#10151d] text-[#ffd000]" : "text-foreground/60")}>{l}</button>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {rides.isLoading ? <ListSkeleton /> : rides.isError ? <ErrorState message={errorText(rides.error)} onRetry={() => rides.refetch()} /> :
          list.length === 0 ? (
            <EmptyState title={tab === "all" ? "لسه مفيش رحلات" : "مفيش حاجة هنا"} body={tab === "all" ? (profile.role === "driver" ? "لما تقبل أول طلب هيظهر هنا." : "أول مشوار تطلبه هيتسجل هنا وتقدر تتابعه.") : "مفيش رحلات بالحالة دي."}>
              {tab === "all" && <Link href="/book" data-testid="link-empty-book" className="press rounded-2xl bg-[#ffd000] px-5 py-3 font-display font-bold text-[#10151d]">{profile.role === "driver" ? "شوف الطلبات" : "اطلب أول رحلة"}</Link>}
            </EmptyState>
          ) : list.map((r, i) => (
            <div key={r.id} className="space-y-3">
              <RideCard ride={r} i={i} />
              {ACTIVE.includes(r.status) && (
                <section className="rounded-3xl border border-card-border bg-card p-4" data-testid={`panel-trip-map-${r.id}`}>
                  <h2 className="mb-2 font-display font-bold">{profile.role === "driver" ? "خريطة الرحلة" : "خريطة رحلتك وموقع الكابتن"}</h2>
                  <RideMap ride={r} />
                  {profile.role !== "driver" && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">موقع الكابتن يظهر بعد قبول الطلب وموافقته على مشاركة موقعه أثناء الرحلة.</p>
                  )}
                </section>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
