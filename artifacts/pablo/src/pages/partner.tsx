import { useMemo, useState } from "react";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import type { Profile, Ride } from "@workspace/api-client-react";
import { EmptyState, ErrorState, ListSkeleton, RouteLine, StatusPill } from "@/components/bits";
import { RideChat } from "@/components/ride-chat";
import { useMyRides } from "@/hooks/use-pablo";
import { errorText } from "@/lib/pablo";
import { cn } from "@/lib/utils";

const ACTIVE_CHAT_STATES = ["accepted", "arrived", "in_progress"];
const CHAT_HISTORY_STATES = [...ACTIVE_CHAT_STATES, "completed", "cancelled"];

export default function Partner({ profile }: { profile: Profile }) {
  const rides = useMyRides();
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const conversations = useMemo(() => (rides.data ?? [])
    .filter((ride) => {
      const participant = profile.role === "driver" ? ride.driverId === profile.id : ride.customerId === profile.id;
      return participant && Boolean(ride.driverId) && CHAT_HISTORY_STATES.includes(ride.status);
    })
    .sort((a, b) => {
      const activeA = ACTIVE_CHAT_STATES.includes(a.status) ? 1 : 0;
      const activeB = ACTIVE_CHAT_STATES.includes(b.status) ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }), [rides.data, profile.id, profile.role]);

  const selectedRide: Ride | undefined = conversations.find((ride) => ride.id === selectedRideId)
    ?? conversations[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" data-testid="page-partner">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#10151d] text-[#ffd000]">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-black">شريك الرحلة</h1>
            <p className="mt-1 text-sm text-muted-foreground">دردشة مباشرة بين العميل والكابتن المرتبط بنفس الطلب.</p>
          </div>
        </div>
      </div>

      {rides.isLoading ? <ListSkeleton /> : rides.isError ? (
        <ErrorState message={errorText(rides.error, "مش قادرين نجيب محادثات الرحلات.")} onRetry={() => rides.refetch()} />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="الدردشة هتظهر بعد قبول الرحلة"
          body={profile.role === "driver"
            ? "بعد ما تقبل طلبًا، هتلاقي هنا محادثة العميل المرتبط بالرحلة."
            : "أول ما كابتن يقبل طلبك، هتقدر تتواصلوا هنا لتنسيق نقطة الركوب."}
        >
          <Link href={profile.role === "driver" ? "/book" : "/trips"} data-testid="link-partner-next-step" className="press rounded-2xl bg-[#ffd000] px-5 py-3 font-display font-bold text-[#10151d]">
            {profile.role === "driver" ? "شوف الطلبات" : "تابع رحلاتي"}
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]">
          <aside className="rounded-3xl border border-card-border bg-card p-3">
            <h2 className="px-2 py-2 font-display font-bold">محادثات الرحلات</h2>
            <div className="space-y-2">
              {conversations.map((ride) => {
                const active = selectedRide?.id === ride.id;
                return (
                  <button
                    key={ride.id}
                    type="button"
                    onClick={() => setSelectedRideId(ride.id)}
                    className={cn("press block w-full rounded-2xl border p-3 text-right transition-colors", active ? "border-[#10151d] bg-[#10151d] text-[#f6f1e4]" : "border-border bg-background hover:bg-muted")}
                    data-testid={`button-partner-ride-${ride.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] opacity-70">رحلة #{ride.id}</span>
                      <StatusPill status={ride.status} />
                    </div>
                    <div className="mt-2 text-xs">
                      <RouteLine from={ride.pickup} to={ride.destination} />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
          <section className="min-w-0" aria-label="محادثة شريك الرحلة">
            {selectedRide && <RideChat key={selectedRide.id} rideId={selectedRide.id} profile={profile} rideStatus={selectedRide.status} />}
          </section>
        </div>
      )}
    </div>
  );
}
