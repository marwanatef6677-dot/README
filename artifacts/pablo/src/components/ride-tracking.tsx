import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Navigation, Pause, Radio, RotateCw, Square } from "lucide-react";
import {
  getGetRideLocationQueryKey, useGetRideLocation, usePreviewRoute, useStopRideTracking, useUpdateRideLocation,
} from "@workspace/api-client-react";
import type { Ride, RoutePreview } from "@workspace/api-client-react";
import { PabloMap, type DriverPin } from "@/components/pablo-map";
import { cn } from "@/lib/utils";

const LIVE_STATES = ["accepted", "arrived", "in_progress"];
const STALE_MS = 30_000;
const MIN_GAP_MS = 5_000;

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

/** Map for a ride: pins, real road route (if available), and the driver's latest reported location. */
export function RideMap({ ride }: { ride: Ride }) {
  const live = LIVE_STATES.includes(ride.status);
  const hasPick = ride.pickupLat != null && ride.pickupLng != null;
  const hasDest = ride.destinationLat != null && ride.destinationLng != null;
  const pickup = useMemo(() => (hasPick ? { lat: ride.pickupLat!, lng: ride.pickupLng! } : null), [hasPick, ride.pickupLat, ride.pickupLng]);
  const destination = useMemo(() => (hasDest ? { lat: ride.destinationLat!, lng: ride.destinationLng! } : null), [hasDest, ride.destinationLat, ride.destinationLng]);

  const loc = useGetRideLocation(ride.id, { query: { queryKey: getGetRideLocationQueryKey(ride.id), enabled: live, refetchInterval: live ? 5000 : false } });
  const now = useNow(5000);

  const preview = usePreviewRoute();
  const previewRef = useRef(preview.mutate); previewRef.current = preview.mutate;
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [routeErr, setRouteErr] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!pickup || !destination) return;
    let alive = true;
    setRouteErr(false);
    previewRef.current({ data: { pickupLat: pickup.lat, pickupLng: pickup.lng, destinationLat: destination.lat, destinationLng: destination.lng, rideType: ride.rideType, serviceType: ride.serviceType } }, {
      onSuccess: (r) => { if (alive) setRoute(r); },
      onError: () => { if (alive) setRouteErr(true); },
    });
    return () => { alive = false; };
  }, [pickup, destination, ride.rideType, ride.serviceType, retry]);

  const l = live ? loc.data?.location ?? null : null;
  const age = l ? now - new Date(l.updatedAt).getTime() : Infinity;
  const stale = age > STALE_MS;
  const driver: DriverPin | null = useMemo(() => (l ? { lat: l.latitude, lng: l.longitude, accuracy: l.accuracy, stale } : null), [l, stale]);

  if (!pickup && !destination) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-foreground/20 bg-muted/30 p-5 text-sm" data-testid="text-no-map">
        <p className="font-semibold text-foreground">الخريطة مش متاحة للرحلة دي</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">الطلب اتسجل قبل حفظ المواقع على الخريطة، فمش هنعرض مكانًا غير مؤكد. الطلبات الجديدة بتحفظ نقطتي الركوب والوصول من الخريطة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PabloMap pickup={pickup} destination={destination} route={route?.coordinates} driver={driver} className="h-[320px] md:h-[380px]" fitKey={`${ride.id}-${route ? 1 : 0}`} />
      <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
        {route && <span className="rounded-full bg-muted px-3 py-1"><span className="font-num font-bold">{(route.distanceMeters / 1000).toFixed(1)}</span> كم بالطريق · <span className="font-num font-bold">{Math.max(1, Math.round(route.durationSeconds / 60))}</span> دقيقة سواقة تقديرياً (من غير زحمة)</span>}
        {routeErr && <span className="rounded-full bg-muted px-3 py-1">مقدرناش نجيب الطريق. <button className="font-bold underline" data-testid="button-ride-route-retry" onClick={() => setRetry((n) => n + 1)}>جرّب تاني</button></span>}
        {live && (
          !l ? <span className="rounded-full border border-dashed border-foreground/25 px-3 py-1 text-muted-foreground" data-testid="status-driver-location">الكابتن مش بيشارك مكانه دلوقتي</span>
          : stale ? <span className="rounded-full bg-destructive/10 px-3 py-1 font-semibold text-destructive" data-testid="status-driver-location">آخر مكان للكابتن قديم (مش مباشر) · دقة {Math.round(l.accuracy).toLocaleString("ar-EG")} م</span>
          : <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10151d] px-3 py-1 font-semibold text-[#ffd000]" data-testid="status-driver-location"><span className="h-1.5 w-1.5 rounded-full bg-[#ffd000]" />مكان الكابتن من {Math.max(0, Math.round(age / 1000)).toLocaleString("ar-EG")} ثانية · دقة {Math.round(l.accuracy).toLocaleString("ar-EG")} م</span>
        )}
      </div>
    </div>
  );
}

type ShareState = "off" | "starting" | "sharing" | "paused-hidden" | "error" | "stopping";

/** Driver-only opt-in location sharing. Foreground only; mounted only while the ride is active. */
export function DriverShare({ rideId }: { rideId: number }) {
  const update = useUpdateRideLocation();
  const stopM = useStopRideTracking();
  const updateRef = useRef(update.mutateAsync); updateRef.current = update.mutateAsync;
  const stopRef = useRef(stopM.mutateAsync); stopRef.current = stopM.mutateAsync;

  const [state, setState] = useState<ShareState>("off");
  const [msg, setMsg] = useState("");
  const [lastSent, setLastSent] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const active = useRef(false); // true only while we intend to send
  const inFlight = useRef(false);
  const inFlightP = useRef<Promise<unknown> | null>(null);
  const lastSentAt = useRef(0);
  const sharedOnce = useRef(false);

  function clearWatch() {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
  }

  function onPos(p: GeolocationPosition) {
    if (!active.current) return;
    const now = Date.now();
    if (now - p.timestamp > STALE_MS) return;
    if (inFlight.current || now - lastSentAt.current < MIN_GAP_MS) return;
    inFlight.current = true;
    lastSentAt.current = now;
    inFlightP.current = updateRef.current({ id: rideId, data: { latitude: +p.coords.latitude.toFixed(6), longitude: +p.coords.longitude.toFixed(6), accuracy: Math.min(100000, Math.max(0, Math.round(p.coords.accuracy))) } })
      .then(() => { if (active.current) { setLastSent(Date.now()); setState("sharing"); setMsg(""); } })
      .catch(() => {
        if (active.current) {
          active.current = false;
          clearWatch();
          setState("error");
          setMsg("تحديث الموقع مااتبعتش. المشاركة اتوقفت؛ راجع الاتصال وابدأ تاني.");
        }
      })
      .finally(() => { inFlight.current = false; });
  }

  function start() {
    if (!("geolocation" in navigator)) { setState("error"); setMsg("المتصفح ده مش بيدعم تحديد المكان."); return; }
    clearWatch();
    active.current = true; sharedOnce.current = true;
    setState("starting"); setMsg("");
    watchId.current = navigator.geolocation.watchPosition(onPos, (e) => {
      active.current = false; clearWatch();
      setState("error");
      setMsg(e.code === 1 ? "إذن الموقع اترفض. اسمح بيه من إعدادات المتصفح وبعدين ابدأ تاني." : e.code === 3 ? "تحديد المكان خد وقت طويل. المشاركة وقفت، ابدأ تاني لما تكون جاهز." : "مش قادرين نقرا مكانك. المشاركة وقفت.");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }

  async function stop() {
    active.current = false; clearWatch();
    setState("stopping");
    await inFlightP.current?.catch(() => undefined);
    try {
      await stopRef.current({ id: rideId });
      setMsg("وقفنا المشاركة ومسحنا آخر مكان ليك من الرحلة.");
      setState("off");
    } catch {
      setMsg("وقفنا الإرسال من الجهاز، بس مقدرناش نمسح آخر مكان من السيرفر. جرّب الإيقاف تاني.");
      setState("error");
    }
    setLastSent(null);
  }

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && active.current) {
        active.current = false; clearWatch(); setState("paused-hidden");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      const wasSharing = sharedOnce.current;
      active.current = false; clearWatch();
      if (wasSharing) Promise.resolve(inFlightP.current).catch(() => undefined).then(() => stopRef.current({ id: rideId })).catch(() => undefined);
    };
  }, [rideId]);

  const now = useNow(5000);
  const sending = state === "sharing" || state === "starting";
  const ago = lastSent ? Math.round((now - lastSent) / 1000) : null;

  return (
    <div className={cn("rounded-[1.75rem] p-5", sending ? "bg-[#10151d] text-[#f6f1e4]" : "border border-card-border bg-card")} data-testid="panel-driver-share">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display font-bold">
            {sending ? <Radio className="h-4 w-4 text-[#ffd000]" /> : state === "paused-hidden" || state === "error" ? <Pause className="h-4 w-4 text-destructive" /> : <Navigation className="h-4 w-4" />}
            {state === "starting" ? "بنستنى أول قراءة..." : state === "sharing" ? "بتشارك مكانك مع الراكب" : state === "paused-hidden" ? "المشاركة متوقفة: سبت الصفحة" : state === "error" ? "المشاركة متوقفة" : state === "stopping" ? "بنوقف المشاركة..." : "مكانك مش بيتشارك"}
          </p>
          <p className={cn("mt-1 text-xs leading-relaxed", sending ? "text-[#f6f1e4]/65" : "text-muted-foreground")}>
            المشاركة شغالة بس والصفحة دي مفتوحة قدامك. لو قفلت الشاشة أو فتحت تطبيق تاني المتصفح ممكن يوقفها. بنبعت مكانك كل ٥ ثواني على الأكثر.
          </p>
          {state === "sharing" && ago != null && <p className="mt-2 text-xs text-[#ffd000]" data-testid="text-last-sent">آخر إرسال من {ago.toLocaleString("ar-EG")} ثانية</p>}
          {msg && <p className={cn("mt-2 text-xs font-semibold", state === "error" ? "text-destructive" : sending ? "text-[#f6f1e4]/80" : "text-foreground/80")} data-testid="text-share-msg">{msg}</p>}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {sending ? (
          <button type="button" data-testid="button-stop-sharing" onClick={stop} className="press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f6f1e4] font-display font-bold text-[#10151d]"><Square className="h-4 w-4 fill-current" /> وقّف المشاركة</button>
        ) : (
          <>
            <button type="button" data-testid="button-start-sharing" disabled={state === "stopping"} onClick={start} className="press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ffd000] font-display font-bold text-[#10151d] disabled:opacity-60">
              {state === "stopping" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "off" ? <Radio className="h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
              {state === "off" || state === "stopping" ? "ابدأ مشاركة مكاني" : "كمّل المشاركة"}
            </button>
            {(state === "paused-hidden" || state === "error") && (
              <button type="button" data-testid="button-erase-location" onClick={stop} className="press h-12 rounded-2xl border border-foreground/15 px-4 text-sm font-semibold">وقّف وامسح</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
