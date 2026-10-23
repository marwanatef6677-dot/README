import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Car, Crown, Crosshair, Flag, Loader2, MapPin, RotateCw, Users, X } from "lucide-react";
import { useCreateRide, usePreviewRoute } from "@workspace/api-client-react";
import type { RideTypeId, RoutePreview } from "@workspace/api-client-react";
import { PabloMap, type LatLng } from "@/components/pablo-map";
import { useConfig, useInvalidateRides } from "@/hooks/use-pablo";
import { useToast } from "@/hooks/use-toast";
import { Btn, Skeleton } from "@/components/bits";
import { clearDraft, errorText, loadDraft, saveDraft, type Draft } from "@/lib/pablo";
import { cn } from "@/lib/utils";

const typeIcon: Record<RideTypeId, typeof Car> = { economy: Car, family: Users, premium: Crown };

export const fieldCls = "h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-[#10151d] focus:shadow-[0_0_0_4px_rgba(255,208,0,.45)]";

export function BookingForm({ signedIn, defaultProvince }: { signedIn: boolean; defaultProvince?: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const config = useConfig();
  const create = useCreateRide();
  const invalidate = useInvalidateRides();
  const [d, setD] = useState<Draft>(() => loadDraft());
  const [errs, setErrs] = useState<Partial<Record<keyof Draft, string>>>({});
  const [geo, setGeo] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [geoMsg, setGeoMsg] = useState("");
  const [serverErr, setServerErr] = useState("");
  const restored = useRef(!!loadDraft().pickup || !!loadDraft().destination);

  useEffect(() => {
    if (!d.province && defaultProvince) setD((x) => ({ ...x, province: defaultProvince }));
  }, [defaultProvince, d.province]);
  useEffect(() => { saveDraft(d); }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErrs((e) => ({ ...e, [k]: undefined })); };

  const [mode, setMode] = useState<"pickup" | "destination">(() => (loadDraft().pickupLat != null && loadDraft().destinationLat == null ? "destination" : "pickup"));
  const pick: LatLng | null = d.pickupLat != null && d.pickupLng != null ? { lat: d.pickupLat, lng: d.pickupLng } : null;
  const dest: LatLng | null = d.destinationLat != null && d.destinationLng != null ? { lat: d.destinationLat, lng: d.destinationLng } : null;
  const pickM = useMemo(() => pick, [d.pickupLat, d.pickupLng]); // eslint-disable-line react-hooks/exhaustive-deps
  const destM = useMemo(() => dest, [d.destinationLat, d.destinationLng]); // eslint-disable-line react-hooks/exhaustive-deps
  const coordLabel = (p: LatLng) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

  function placePin(which: "pickup" | "destination", p: LatLng) {
    if (which === "pickup") {
      setD((x) => ({ ...x, pickupLat: p.lat, pickupLng: p.lng, pickup: x.pickup.trim() ? x.pickup : `نقطة على الخريطة (${coordLabel(p)})` }));
      setErrs((e) => ({ ...e, pickup: undefined, pickupLat: undefined }));
      if (d.destinationLat == null) setMode("destination");
    } else {
      setD((x) => ({ ...x, destinationLat: p.lat, destinationLng: p.lng, destination: x.destination.trim() ? x.destination : `نقطة على الخريطة (${coordLabel(p)})` }));
      setErrs((e) => ({ ...e, destination: undefined, destinationLat: undefined }));
    }
  }
  function clearPin(which: "pickup" | "destination") {
    if (which === "pickup") { setD((x) => ({ ...x, pickupLat: undefined, pickupLng: undefined })); setGeo("idle"); setGeoMsg(""); }
    else setD((x) => ({ ...x, destinationLat: undefined, destinationLng: undefined }));
    setMode(which);
  }

  // Route preview: debounced, stale responses ignored via sequence id.
  const preview = usePreviewRoute();
  const previewRef = useRef(preview.mutate); previewRef.current = preview.mutate;
  const seq = useRef(0);
  const [route, setRoute] = useState<{ s: "idle" | "loading" | "ok" | "err"; data?: RoutePreview }>({ s: "idle" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const id = ++seq.current;
    if (d.pickupLat == null || d.pickupLng == null || d.destinationLat == null || d.destinationLng == null) { setRoute({ s: "idle" }); return; }
    setRoute({ s: "loading" });
    const body = { pickupLat: d.pickupLat, pickupLng: d.pickupLng, destinationLat: d.destinationLat, destinationLng: d.destinationLng };
    const t = setTimeout(() => {
      previewRef.current({ data: body }, {
        onSuccess: (r) => { if (seq.current === id) setRoute({ s: "ok", data: r }); },
        onError: () => { if (seq.current === id) setRoute({ s: "err" }); },
      });
    }, 700);
    return () => clearTimeout(t);
  }, [d.pickupLat, d.pickupLng, d.destinationLat, d.destinationLng, retry]);
  useEffect(() => () => { seq.current++; }, []);

  function locate() {
    if (!("geolocation" in navigator)) { setGeo("err"); setGeoMsg("المتصفح ده مش بيدعم تحديد المكان. حط الدبوس على الخريطة بنفسك."); return; }
    setGeo("busy"); setGeoMsg("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        placePin("pickup", { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) });
        setGeo("ok"); setGeoMsg(`حطينا دبوس الركوب على مكانك (دقة تقريبية ${Math.round(p.coords.accuracy).toLocaleString("ar-EG")} متر). اتأكد منه على الخريطة.`);
      },
      (e) => {
        setGeo("err");
        setGeoMsg(e.code === 1 ? "رفضت إذن الموقع. ممكن تسمح بيه من إعدادات المتصفح أو تحط الدبوس على الخريطة." : e.code === 3 ? "تحديد المكان خد وقت طويل. جرّب تاني أو اضغط على الخريطة." : "مش قادرين نحدد مكانك دلوقتي. اضغط على الخريطة بدل كده.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  function validate() {
    const e: typeof errs = {};
    if (d.pickup.trim().length < 3) e.pickup = "اكتب نقطة الركوب (٣ حروف على الأقل)";
    if (d.destination.trim().length < 3) e.destination = "اكتب رايح فين (٣ حروف على الأقل)";
    if (d.pickupLat == null || d.pickupLng == null) e.pickupLat = "حط دبوس الركوب على الخريطة";
    if (d.destinationLat == null || d.destinationLng == null) e.destinationLat = "حط دبوس الوصول على الخريطة";
    if (!d.province) e.province = "اختار المحافظة";
    if (d.notes.length > 500) e.notes = "الملاحظات طويلة شوية (أقصى حد ٥٠٠ حرف)";
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerErr("");
    if (!validate()) return;
    if (!signedIn) { saveDraft(d); setLocation("/sign-in"); return; }
    if (d.pickupLat == null || d.pickupLng == null || d.destinationLat == null || d.destinationLng == null) return;
    create.mutate({
      data: {
        pickup: d.pickup.trim(), destination: d.destination.trim(), province: d.province, rideType: d.rideType,
        ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
        pickupLat: d.pickupLat, pickupLng: d.pickupLng, destinationLat: d.destinationLat, destinationLng: d.destinationLng,
      },
    }, {
      onSuccess: (ride) => {
        clearDraft(); invalidate(ride.id);
        toast({ title: "الطلب اتبعت", description: "هنبلغك هنا أول ما كابتن يقبله." });
        setLocation(`/trips/${ride.id}`);
      },
      onError: (err) => setServerErr(errorText(err)),
    });
  }

  const types = config.data?.rideTypes;
  return (
    <form onSubmit={submit} className="space-y-5" noValidate data-testid="form-booking">
      {restored.current && signedIn && (
        <p className="rounded-xl bg-accent px-3 py-2 text-sm" data-testid="text-draft-restored">رجّعنا لك الطلب اللي كنت بتكتبه. راجعه واطلب لما تكون جاهز.</p>
      )}
      <div className="overflow-hidden rounded-[2rem] bg-[#10151d] p-2 shadow-[0_24px_60px_-30px_rgba(16,21,29,.7)]">
        <div className="flex gap-1.5 p-1.5" role="radiogroup" aria-label="بتحدد إيه على الخريطة">
          {(["pickup", "destination"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} data-testid={`button-mode-${k}`} onClick={() => setMode(k)}
              className={cn("press flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors", mode === k ? "bg-[#ffd000] text-[#10151d]" : "text-[#f6f1e4]/70 hover:bg-[#f6f1e4]/5")}>
              {k === "pickup" ? <MapPin className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
              {k === "pickup" ? "حدد الركوب" : "حدد الوصول"}
              {(k === "pickup" ? pick : dest) && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </button>
          ))}
        </div>
        <div className="relative">
          <PabloMap pickup={pickM} destination={destM} route={route.s === "ok" ? route.data?.coordinates : null} picking onPick={(p) => placePin(mode, p)} className="h-[340px] rounded-[1.5rem] border-0 md:h-[380px]" />
          <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] mx-auto w-fit rounded-full bg-[#10151d]/90 px-3 py-1.5 text-center text-xs font-semibold text-[#f6f1e4]">
            اضغط على الخريطة عشان تحط {mode === "pickup" ? <span className="text-[#ffd000]">نقطة الركوب</span> : <span className="text-[#ffd000]">نقطة الوصول</span>}
          </p>
          <button type="button" data-testid="button-locate" onClick={locate} disabled={geo === "busy"} aria-label="استخدم مكاني كنقطة ركوب"
            className="press absolute bottom-7 left-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-[#ffd000] px-3.5 py-2.5 text-xs font-bold text-[#10151d] shadow-lg disabled:opacity-60">
            {geo === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {geo === "busy" ? "بنحدد مكانك..." : "مكاني = الركوب"}
          </button>
        </div>
        <div className="px-3 pb-2 pt-3 text-[#f6f1e4]" data-testid="route-preview" aria-live="polite">
          {route.s === "idle" && <p className="text-xs text-[#f6f1e4]/60">حط الدبوسين عشان نحسب المسافة بالطريق.</p>}
          {route.s === "loading" && <p className="flex items-center gap-2 text-xs text-[#f6f1e4]/70"><Loader2 className="h-3.5 w-3.5 animate-spin" /> بنحسب الطريق...</p>}
          {route.s === "ok" && route.data && (
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <span><span className="font-num text-xl font-bold text-[#ffd000]">{(route.data.distanceMeters / 1000).toFixed(1)}</span> <span className="text-xs">كم بالطريق</span></span>
              <span><span className="font-num text-xl font-bold text-[#ffd000]">{Math.max(1, Math.round(route.data.durationSeconds / 60))}</span> <span className="text-xs">دقيقة سواقة تقديرياً</span></span>
              <span className="w-full text-[11px] text-[#f6f1e4]/55">وقت السواقة تقدير عام من بيانات الطرق، مش معاد وصول كابتن ومش محسوب فيه الزحمة.</span>
            </div>
          )}
          {route.s === "err" && (
            <p className="text-xs text-[#f6f1e4]/80" data-testid="text-route-error">
              مقدرناش نحسب الطريق دلوقتي. تقدر <button type="button" data-testid="button-route-retry" onClick={() => setRetry((n) => n + 1)} className="inline-flex items-center gap-1 font-bold text-[#ffd000] underline"><RotateCw className="h-3 w-3" />تجرّب تاني</button> أو تكمّل الطلب من غير حساب الطريق.
            </p>
          )}
        </div>
      </div>
      {geoMsg && <p className={cn("text-xs", geo === "err" ? "text-destructive" : "text-muted-foreground")} data-testid="text-geo">{geoMsg}</p>}

      <div className="relative rounded-3xl border border-card-border bg-card p-4">
        <div className="absolute bottom-14 right-[29px] top-12 w-0.5 bg-[repeating-linear-gradient(180deg,hsl(var(--foreground)/.3)_0_4px,transparent_4px_8px)]" />
        {(["pickup", "destination"] as const).map((k) => {
          const p = k === "pickup" ? pick : dest;
          const err = errs[k] || errs[k === "pickup" ? "pickupLat" : "destinationLat"];
          return (
            <div key={k} className={k === "destination" ? "mt-4" : ""}>
              <label className="flex items-center gap-3">
                <span className={cn("z-10 h-3.5 w-3.5 shrink-0", k === "pickup" ? "rounded-full border-[3px] border-[#10151d] bg-[#ffd000]" : "rounded-[4px] bg-[#10151d]")} />
                <input data-testid={`input-${k}`} className={cn(fieldCls, "border-0 bg-muted/60")} maxLength={240}
                  placeholder={k === "pickup" ? "وصف نقطة الركوب: مثلاً قدام محطة مترو الدقي" : "وصف الوجهة"}
                  value={d[k]} onChange={(e) => set(k, e.target.value)} />
              </label>
              <div className="mr-7 mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                {p ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#10151d] px-2.5 py-1 text-[#ffd000]" data-testid={`text-pin-${k}`}>
                    <MapPin className="h-3 w-3" /><span className="font-num">{coordLabel(p)}</span>
                    <button type="button" data-testid={`button-clear-${k}`} onClick={() => clearPin(k)} aria-label="شيل الدبوس" className="mr-1 rounded-full p-0.5 opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
                  </span>
                ) : <span className="text-muted-foreground">لسه مفيش دبوس على الخريطة</span>}
              </div>
              {err && <p className="mr-7 mt-1 text-xs text-destructive">{err}</p>}
            </div>
          );
        })}
        <p className="mt-4 rounded-xl bg-accent px-3 py-2 text-[11px] leading-relaxed">الدبوس اللي على الخريطة هو المكان اللي بيتبعت للكابتن. الكلام المكتوب وصف بس عشان يلاقيك، ومش بنحوّله لمكان.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">المحافظة</label>
        {config.isLoading ? <Skeleton className="h-12" /> : (
          <select data-testid="select-province" className={fieldCls} value={d.province} onChange={(e) => set("province", e.target.value)}>
            <option value="">اختار محافظتك</option>
            {config.data?.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {errs.province && <p className="mt-1 text-xs text-destructive">{errs.province}</p>}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold">نوع العربية</p>
        {config.isLoading ? <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div> : config.isError ? (
          <p className="text-sm text-destructive">مش قادرين نجيب أنواع العربيات. <button type="button" className="underline" onClick={() => config.refetch()}>جرّب تاني</button></p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {types?.map((t) => {
              const Icon = typeIcon[t.id]; const on = d.rideType === t.id;
              return (
                <button type="button" key={t.id} data-testid={`button-ridetype-${t.id}`} onClick={() => set("rideType", t.id)}
                  className={cn("press relative rounded-2xl border-2 p-3 text-right transition-colors", on ? "border-[#10151d] bg-[#ffd000]" : "border-transparent bg-card hover:border-foreground/15")}>
                  <Icon className="h-5 w-5" />
                  <p className="mt-2 font-display text-sm font-bold">{t.name}</p>
                  <p className="text-[11px] leading-snug text-foreground/65">{t.description}</p>
                  <p className="mt-1 text-[11px] font-semibold">{t.seats.toLocaleString("ar-EG")} ركاب</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">ملاحظات للكابتن <span className="font-normal text-muted-foreground">(اختياري)</span></label>
        <textarea data-testid="input-notes" rows={2} maxLength={500} className={cn(fieldCls, "h-auto py-3")} placeholder="مثلاً: معايا شنطة كبيرة، أو هستنى عند البوابة التانية" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
        {errs.notes && <p className="mt-1 text-xs text-destructive">{errs.notes}</p>}
      </div>

      <AnimatePresence>
        {serverErr && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} data-testid="text-booking-error" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{serverErr}</motion.p>
        )}
      </AnimatePresence>

      <Btn type="submit" variant="yellow" data-testid="button-request" disabled={create.isPending} className="h-14 w-full text-lg">
        {create.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> بنبعت الطلب...</> : signedIn ? "اطلب الرحلة" : "سجّل دخول عشان تطلب"}
      </Btn>
      {!signedIn && <p className="text-center text-xs text-muted-foreground">هنحفظ اللي كتبته، وبعد الدخول هتراجعه وتطلب بنفسك.</p>}
    </form>
  );
}
