import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Bike, Car, Crown, Crosshair, Flag, Loader2, MapPin, RotateCw, Search, Users, X } from "lucide-react";
import { useCreateRide, usePreviewRoute, useSearchMapPlaces } from "@workspace/api-client-react";
import type { MapPlaceSearchResult, RideTypeId, RoutePreview, RouteInputServiceType } from "@workspace/api-client-react";
import { PabloMap, type LatLng } from "@/components/pablo-map";
import { useConfig, useInvalidateRides } from "@/hooks/use-pablo";
import { useToast } from "@/hooks/use-toast";
import { Btn, Skeleton } from "@/components/bits";
import { clearDraft, errorText, loadDraft, saveDraft, type Draft } from "@/lib/pablo";
import { cn } from "@/lib/utils";

const typeIcon: Record<RideTypeId, typeof Car> = { economy: Car, family: Users, premium: Crown, motorcycle: Bike };

export const fieldCls = "h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-[#10151d] focus:shadow-[0_0_0_4px_rgba(255,208,0,.45)]";
const MIN_FARE_CAR_PIASTERS = 4_000;
const MIN_FARE_MOTORCYCLE_PIASTERS = 3_000;
const FARE_STEP_PIASTERS = 500;
const MAX_ADJUSTMENT_PIASTERS = 1_000_000;
const formatEgp = (piasters: number) => `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(piasters / 100)} جنيه`;

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
  const [fareAdjustmentPiasters, setFareAdjustmentPiasters] = useState(() => loadDraft().fareAdjustmentPiasters ?? 0);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<MapPlaceSearchResult[]>([]);
  const [placeSearchError, setPlaceSearchError] = useState("");
  const placeSearch = useSearchMapPlaces();
  const autoAddress = useRef<{ pickup: string | null; destination: string | null }>({ pickup: null, destination: null });
  const serviceType: RouteInputServiceType = d.serviceType ?? "passenger";
  const isDelivery = serviceType === "delivery";
  const minimumFarePiasters = d.rideType === "motorcycle" ? MIN_FARE_MOTORCYCLE_PIASTERS : MIN_FARE_CAR_PIASTERS;
  const restored = useRef(!!loadDraft().pickup || !!loadDraft().destination);

  useEffect(() => {
    if (!d.province && defaultProvince) setD((x) => ({ ...x, province: defaultProvince }));
  }, [defaultProvince, d.province]);
  useEffect(() => { saveDraft({ ...d, fareAdjustmentPiasters }); }, [d, fareAdjustmentPiasters]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErrs((e) => ({ ...e, [k]: undefined })); };

  const [mode, setMode] = useState<"pickup" | "destination">(() => (loadDraft().pickupLat != null && loadDraft().destinationLat == null ? "destination" : "pickup"));
  const pick: LatLng | null = d.pickupLat != null && d.pickupLng != null ? { lat: d.pickupLat, lng: d.pickupLng } : null;
  const dest: LatLng | null = d.destinationLat != null && d.destinationLng != null ? { lat: d.destinationLat, lng: d.destinationLng } : null;
  const pickM = useMemo(() => pick, [d.pickupLat, d.pickupLng]); // eslint-disable-line react-hooks/exhaustive-deps
  const destM = useMemo(() => dest, [d.destinationLat, d.destinationLng]); // eslint-disable-line react-hooks/exhaustive-deps
  const coordLabel = (p: LatLng) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

  function placePin(which: "pickup" | "destination", p: LatLng, searchedAddress?: string) {
    const currentAddress = which === "pickup" ? d.pickup : d.destination;
    const previousAutoAddress = autoAddress.current[which];
    const nextAddress = searchedAddress?.slice(0, 240)
      ?? (previousAutoAddress && currentAddress === previousAutoAddress ? "" : currentAddress);
    autoAddress.current[which] = searchedAddress ? nextAddress : null;
    if (which === "pickup") {
      setD((x) => ({ ...x, pickupLat: p.lat, pickupLng: p.lng, pickup: nextAddress }));
      setErrs((e) => ({ ...e, pickup: undefined, pickupLat: undefined }));
      if (d.destinationLat == null) {
        setMode("destination");
        setPlaceQuery("");
        setPlaceResults([]);
        setPlaceSearchError("");
      }
    } else {
      setD((x) => ({ ...x, destinationLat: p.lat, destinationLng: p.lng, destination: nextAddress }));
      setErrs((e) => ({ ...e, destination: undefined, destinationLat: undefined }));
    }
  }
  function clearPin(which: "pickup" | "destination") {
    if (which === "pickup") {
      const nextAddress = autoAddress.current.pickup === d.pickup ? "" : d.pickup;
      setD((x) => ({ ...x, pickupLat: undefined, pickupLng: undefined, pickup: nextAddress }));
      autoAddress.current.pickup = null;
      setGeo("idle"); setGeoMsg("");
    } else {
      const nextAddress = autoAddress.current.destination === d.destination ? "" : d.destination;
      setD((x) => ({ ...x, destinationLat: undefined, destinationLng: undefined, destination: nextAddress }));
      autoAddress.current.destination = null;
    }
    setMode(which);
  }
  function changeAddress(which: "pickup" | "destination", value: string) {
    if (autoAddress.current[which] && autoAddress.current[which] !== value) autoAddress.current[which] = null;
    set(which, value);
  }

  function searchForPlace() {
    const query = placeQuery.trim();
    if (query.length < 3) {
      setPlaceResults([]);
      setPlaceSearchError("اكتب اسم مكان من ٣ حروف على الأقل.");
      return;
    }
    setPlaceSearchError("");
    setPlaceResults([]);
    placeSearch.mutate({
      data: { query, ...(d.province ? { province: d.province } : {}) },
    }, {
      onSuccess: (results) => {
        setPlaceResults(results);
        if (results.length === 0) setPlaceSearchError("ملقيناش المكان. جرّب اسمًا أقصر أو اكتبه يدويًا وحدد الدبوس.");
      },
      onError: (error) => setPlaceSearchError(errorText(error, "البحث مش متاح دلوقتي. اكتب العنوان يدويًا أو حدد الدبوس على الخريطة.")),
    });
  }

  function choosePlace(place: MapPlaceSearchResult) {
    placePin(mode, { lat: place.latitude, lng: place.longitude }, place.label);
    setPlaceQuery("");
    setPlaceResults([]);
    setPlaceSearchError("");
  }

  // Route preview: debounced, stale responses ignored via sequence id.
  const preview = usePreviewRoute();
  const previewRef = useRef(preview.mutate); previewRef.current = preview.mutate;
  const seq = useRef(0);
  const [route, setRoute] = useState<{ s: "idle" | "loading" | "ok" | "err"; data?: RoutePreview }>({ s: "idle" });
  const [retry, setRetry] = useState(0);
  const routeKey = `${d.pickupLat ?? ""}|${d.pickupLng ?? ""}|${d.destinationLat ?? ""}|${d.destinationLng ?? ""}`;
  const fareKey = `${d.rideType}|${serviceType}`;
  const previousRouteKey = useRef(routeKey);
  useEffect(() => {
    const id = ++seq.current;
    if (previousRouteKey.current !== routeKey) {
      previousRouteKey.current = routeKey;
      setFareAdjustmentPiasters(0);
    }
    if (d.pickupLat == null || d.pickupLng == null || d.destinationLat == null || d.destinationLng == null) { setRoute({ s: "idle" }); return; }
    setRoute({ s: "loading" });
    const body = { pickupLat: d.pickupLat, pickupLng: d.pickupLng, destinationLat: d.destinationLat, destinationLng: d.destinationLng, rideType: d.rideType, serviceType };
    const t = setTimeout(() => {
      previewRef.current({ data: body }, {
        onSuccess: (r) => { if (seq.current === id) setRoute({ s: "ok", data: r }); },
        onError: () => { if (seq.current === id) setRoute({ s: "err" }); },
      });
    }, 700);
    return () => clearTimeout(t);
  }, [routeKey, fareKey, retry]);
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
    if (d.pickup.trim().length < 3) e.pickup = "اكتب عنوان الركوب يدويًا أو اختار عنوانًا من البحث";
    if (d.destination.trim().length < 3) e.destination = "اكتب عنوان الوجهة يدويًا أو اختار عنوانًا من البحث";
    if (d.pickupLat == null || d.pickupLng == null) e.pickupLat = "حط دبوس الركوب على الخريطة";
    if (d.destinationLat == null || d.destinationLng == null) e.destinationLat = "حط دبوس الوصول على الخريطة";
    if (!d.province) e.province = "اختار المحافظة";
    if (d.notes.length > 500) e.notes = "الملاحظات طويلة شوية (أقصى حد ٥٠٠ حرف)";
    if (isDelivery) {
      if ((d.deliveryDescription ?? "").trim().length < 3) e.deliveryDescription = "اكتب وصف الحاجة اللي هتتبعت";
      if ((d.recipientName ?? "").trim().length < 2) e.recipientName = "اكتب اسم المستلم";
      if (!/^(01[0125][0-9]{8}|\+201[0125][0-9]{8})$/.test((d.recipientPhone ?? "").replace(/\s|-/g, ""))) e.recipientPhone = "اكتب رقم موبايل مصري صحيح";
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerErr("");
    if (!validate()) return;
    if (route.s !== "ok" || !route.data) {
      setServerErr("احسب الطريق والسعر الأول قبل إرسال الطلب.");
      return;
    }
    if (!signedIn) { saveDraft({ ...d, fareAdjustmentPiasters }); setLocation("/sign-in"); return; }
    if (d.pickupLat == null || d.pickupLng == null || d.destinationLat == null || d.destinationLng == null) return;
    create.mutate({
      data: {
        pickup: d.pickup.trim(), destination: d.destination.trim(), province: d.province, rideType: d.rideType, serviceType,
        ...(isDelivery ? { deliveryDescription: d.deliveryDescription?.trim(), recipientName: d.recipientName?.trim(), recipientPhone: d.recipientPhone?.replace(/\s|-/g, "") } : {}),
        ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
        pickupLat: d.pickupLat, pickupLng: d.pickupLng, destinationLat: d.destinationLat, destinationLng: d.destinationLng,
        fareAdjustmentPiasters,
      },
    }, {
      onSuccess: (ride) => {
        clearDraft(); invalidate(ride.id);
        toast({ title: "الطلب اتبعت", description: `السعر المعروض على الكابتن: ${formatEgp(ride.farePiasters ?? route.data!.estimatedFarePiasters)}. هنبلغك هنا لو قبله.` });
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
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="radiogroup" aria-label="نوع الخدمة">
        {([{ value: "passenger", label: "مشوار راكب", hint: "تنقّل بالعربية أو الموتوسيكل" }, { value: "delivery", label: "توصيل طلب", hint: "إرسال حاجة مع كابتن موتوسيكل" }] as const).map((option) => (
          <button type="button" key={option.value} role="radio" aria-checked={serviceType === option.value} data-testid={`button-service-${option.value}`} onClick={() => {
            setD((current) => ({ ...current, serviceType: option.value, rideType: option.value === "delivery" ? "motorcycle" : current.rideType === "motorcycle" ? "economy" : current.rideType }));
            setFareAdjustmentPiasters(0);
          }} className={cn("rounded-xl px-3 py-3 text-right transition-colors", serviceType === option.value ? "bg-[#10151d] text-[#ffd000]" : "text-foreground/65 hover:bg-card")}>
            <span className="block text-sm font-bold">{option.label}</span><span className={cn("mt-1 block text-[10px]", serviceType === option.value ? "text-white/65" : "text-muted-foreground")}>{option.hint}</span>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[2rem] bg-[#10151d] p-2 shadow-[0_24px_60px_-30px_rgba(16,21,29,.7)]">
        <div className="flex gap-1.5 p-1.5" role="radiogroup" aria-label="بتحدد إيه على الخريطة">
          {(["pickup", "destination"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} data-testid={`button-mode-${k}`} onClick={() => { setMode(k); setPlaceQuery(""); setPlaceResults([]); setPlaceSearchError(""); }}
              className={cn("press flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors", mode === k ? "bg-[#ffd000] text-[#10151d]" : "text-[#f6f1e4]/70 hover:bg-[#f6f1e4]/5")}>
              {k === "pickup" ? <MapPin className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
              {k === "pickup" ? "نقطة الركوب" : "الوجهة"}
              {(k === "pickup" ? pick : dest) && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </button>
          ))}
        </div>
        <div className="space-y-2 px-2 pb-2" data-testid="place-search">
          <div className="flex gap-2">
            <input
              value={placeQuery}
              onChange={(event) => { setPlaceQuery(event.target.value); setPlaceSearchError(""); setPlaceResults([]); }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); searchForPlace(); } }}
              maxLength={160}
              aria-label={mode === "pickup" ? "ابحث عن مكان الركوب" : "ابحث عن الوجهة"}
              placeholder={mode === "pickup" ? "ابحث عن مكان الركوب بالاسم" : "ابحث عن الوجهة بالاسم"}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[#f6f1e4]/15 bg-[#f6f1e4]/10 px-3 text-sm text-[#f6f1e4] outline-none placeholder:text-[#f6f1e4]/45 focus:border-[#ffd000]"
              data-testid="input-place-search"
            />
            <button type="button" onClick={searchForPlace} disabled={placeSearch.isPending || placeQuery.trim().length < 3}
              className="press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#ffd000] px-3 text-sm font-bold text-[#10151d] disabled:opacity-50" data-testid="button-place-search">
              {placeSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              بحث
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-[#f6f1e4]/55">اسم المكان اللي بتبحث عنه بيتبعت إلى OpenStreetMap لعرض النتائج. اختار نتيجة لملء العنوان والدبوس، أو حدد المكان واكتب العنوان بنفسك.</p>
          {placeSearchError && <p className="text-xs text-[#ffd000]" role="status" data-testid="text-place-search-error">{placeSearchError}</p>}
          {placeResults.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[#f6f1e4]/15 bg-[#171d25] p-1" role="listbox" aria-label="نتائج البحث" data-testid="list-place-search-results">
              {placeResults.map((place) => (
                <button key={place.id} type="button" role="option" aria-selected="false" onClick={() => choosePlace(place)}
                  className="press block w-full rounded-lg px-3 py-2 text-right text-xs leading-relaxed text-[#f6f1e4] hover:bg-[#f6f1e4]/10" data-testid={`button-place-result-${place.id}`}>
                  {place.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <PabloMap pickup={pickM} destination={destM} route={route.s === "ok" ? route.data?.coordinates : null} picking onPick={(p) => placePin(mode, p)} className="h-[340px] rounded-[1.5rem] border-0 md:h-[380px]" />
          <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] mx-auto w-fit rounded-full bg-[#10151d]/90 px-3 py-1.5 text-center text-xs font-semibold text-[#f6f1e4]">
            اضغط على الخريطة لتحديد {mode === "pickup" ? <span className="text-[#ffd000]">نقطة الركوب</span> : <span className="text-[#ffd000]">الوجهة</span>}
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <span><span className="font-num text-xl font-bold text-[#ffd000]">{(route.data.distanceMeters / 1000).toFixed(1)}</span> <span className="text-xs">كم بالطريق</span></span>
                <span><span className="font-num text-xl font-bold text-[#ffd000]">{Math.max(1, Math.round(route.data.durationSeconds / 60))}</span> <span className="text-xs">دقيقة سواقة تقديرياً</span></span>
              </div>
              <div className="rounded-2xl border border-[#ffd000]/40 bg-[#ffd000]/10 p-3" data-testid="fare-preview">
                 <p className="text-xs text-[#f6f1e4]/70">السعر الأساسي حسب المسافة والوقت</p>
                 <p className="mt-1 font-display text-sm font-bold">{config.data?.fareDescriptions?.[isDelivery ? "delivery" : d.rideType === "motorcycle" ? "motorcycle" : "car"] ?? (isDelivery ? "٣٠ جنيه بداية + ٨ جنيه لكل كم" : d.rideType === "motorcycle" ? "١٥ جنيه بداية + ٨ جنيه لكل كم + جنيه لكل دقيقة، بحد أدنى ٣٠ جنيه" : "٢٠ جنيه بداية + ١٠ جنيه لكل كم + جنيه لكل دقيقة، بحد أدنى ٤٠ جنيه")}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button type="button" data-testid="button-fare-minus" aria-label="قلل السعر ٥ جنيهات"
                     disabled={route.data.estimatedFarePiasters + fareAdjustmentPiasters - FARE_STEP_PIASTERS < minimumFarePiasters || fareAdjustmentPiasters <= -MAX_ADJUSTMENT_PIASTERS}
                    onClick={() => setFareAdjustmentPiasters((value) => Math.max(-MAX_ADJUSTMENT_PIASTERS, value - FARE_STEP_PIASTERS))}
                    className="press h-10 rounded-xl border border-[#f6f1e4]/20 px-3 text-sm font-bold disabled:opacity-40">− ٥ جنيه</button>
                  <div className="text-center" aria-live="polite">
                    <p className="text-[10px] text-[#f6f1e4]/65">السعر اللي هيشوفه الكابتن</p>
                    <p className="font-num text-xl font-black text-[#ffd000]" data-testid="text-offered-fare">{formatEgp(route.data.estimatedFarePiasters + fareAdjustmentPiasters)}</p>
                  </div>
                  <button type="button" data-testid="button-fare-plus" aria-label="زود السعر ٥ جنيهات"
                    disabled={fareAdjustmentPiasters >= MAX_ADJUSTMENT_PIASTERS}
                    onClick={() => setFareAdjustmentPiasters((value) => Math.min(MAX_ADJUSTMENT_PIASTERS, value + FARE_STEP_PIASTERS))}
                    className="press h-10 rounded-xl border border-[#f6f1e4]/20 px-3 text-sm font-bold disabled:opacity-40">+ ٥ جنيه</button>
                </div>
                <p className="mt-2 text-[11px] text-[#f6f1e4]/65">تقدر تعدّل العرض كل مرة بـ٥ جنيهات. الكابتن هيشوف السعر ويقرر يقبل الرحلة أو يسيبها، والتخفيض لا ينزل عن الحد الأدنى.</p>
              </div>
              <span className="block text-[11px] text-[#f6f1e4]/55">وقت السواقة تقدير عام من بيانات الطرق، مش معاد وصول كابتن ومش محسوب فيه الزحمة.</span>
            </div>
          )}
          {route.s === "err" && (
            <p className="text-xs text-[#f6f1e4]/80" data-testid="text-route-error">
              مقدرناش نحسب الطريق والسعر، فلازم نعيد المحاولة قبل إرسال الطلب. <button type="button" data-testid="button-route-retry" onClick={() => setRetry((n) => n + 1)} className="inline-flex items-center gap-1 font-bold text-[#ffd000] underline"><RotateCw className="h-3 w-3" />تجرّب تاني</button>
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
                <input data-testid={`input-${k}`} aria-label={k === "pickup" ? "عنوان نقطة الركوب يدويًا" : "عنوان الوجهة يدويًا"} className={cn(fieldCls, "border-0 bg-muted/60")} maxLength={240}
                  placeholder={k === "pickup" ? "اكتب عنوان الركوب يدويًا، مثلاً أمام محطة مترو الدقي" : "اكتب عنوان وجهتك يدويًا"}
                  value={d[k]} onChange={(e) => changeAddress(k, e.target.value)} />
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
         <p className="mb-1.5 text-sm font-semibold">{isDelivery ? "نوع المركبة" : "نوع العربية أو المركبة"}</p>
        {config.isLoading ? <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div> : config.isError ? (
          <p className="text-sm text-destructive">مش قادرين نجيب أنواع العربيات. <button type="button" className="underline" onClick={() => config.refetch()}>جرّب تاني</button></p>
        ) : (
           <div className={cn("grid gap-2", isDelivery ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4")}>
             {types?.filter((t) => isDelivery ? t.id === "motorcycle" : true).map((t) => {
              const Icon = typeIcon[t.id]; const on = d.rideType === t.id;
              return (
                <button type="button" key={t.id} data-testid={`button-ridetype-${t.id}`} onClick={() => { set("rideType", t.id); setFareAdjustmentPiasters(0); }}
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

      {isDelivery && <section className="space-y-3 rounded-3xl border border-[#d8cfae] bg-[#fffdf7] p-4" data-testid="section-delivery-details">
        <div><h3 className="font-display font-bold">تفاصيل التوصيل</h3><p className="mt-1 text-xs text-muted-foreground">بيانات المستلم بتظهر للكابتن بعد ما يقبل الطلب.</p></div>
        <div><label className="mb-1 block text-sm font-semibold">إيه اللي هيتبعت؟</label><textarea data-testid="input-delivery-description" rows={2} maxLength={300} className={cn(fieldCls, "h-auto py-3")} value={d.deliveryDescription ?? ""} onChange={(e) => set("deliveryDescription", e.target.value)} placeholder="مثلاً: ظرف مستندات أو طلب من الصيدلية" />{errs.deliveryDescription && <p className="mt-1 text-xs text-destructive">{errs.deliveryDescription}</p>}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-semibold">اسم المستلم</label><input data-testid="input-recipient-name" className={fieldCls} maxLength={80} value={d.recipientName ?? ""} onChange={(e) => set("recipientName", e.target.value)} placeholder="الاسم" />{errs.recipientName && <p className="mt-1 text-xs text-destructive">{errs.recipientName}</p>}</div>
          <div><label className="mb-1 block text-sm font-semibold">موبايل المستلم</label><input data-testid="input-recipient-phone" dir="ltr" inputMode="tel" className={cn(fieldCls, "text-right font-num")} value={d.recipientPhone ?? ""} onChange={(e) => set("recipientPhone", e.target.value)} placeholder="01012345678" />{errs.recipientPhone && <p className="mt-1 text-xs text-destructive">{errs.recipientPhone}</p>}</div>
        </div>
      </section>}

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

      <Btn type="submit" variant="yellow" data-testid="button-request" disabled={create.isPending || route.s !== "ok"} className="h-14 w-full text-lg">
        {create.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> بنبعت الطلب...</> : signedIn ? "اطلب الرحلة" : "سجّل دخول عشان تطلب"}
      </Btn>
      {!signedIn && <p className="text-center text-xs text-muted-foreground">هنحفظ اللي كتبته، وبعد الدخول هتراجعه وتطلب بنفسك.</p>}
    </form>
  );
}
