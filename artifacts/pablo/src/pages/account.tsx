import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Bike, CarFront, Check, Download, Loader2, Lock, MoreVertical, Share, UserRound } from "lucide-react";
import { getGetProfileQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import type { Profile, ProfileInputRole } from "@workspace/api-client-react";
import { Btn, Monogram, PilotNotice, Skeleton } from "@/components/bits";
import { fieldCls } from "@/components/booking-form";
import { useConfig, useInvalidateRides, useSummary } from "@/hooks/use-pablo";
import { useInstall } from "@/hooks/use-install";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/lib/pablo";
import { cn } from "@/lib/utils";

const PHONE = /^(01[0125][0-9]{8}|\+201[0125][0-9]{8})$/;
type Form = { name: string; phone: string; role: ProfileInputRole; province: string; vehicle: string; vehicleType: "car" | "motorcycle"; plate: string; driverTermsAccepted: boolean };

function InstallCard() {
  const { canPrompt, standalone, isIOS, install } = useInstall();
  const { toast } = useToast();
  return (
    <section className="rounded-3xl border border-card-border bg-card p-5" data-testid="section-install">
      <div className="flex items-center gap-3"><Monogram className="h-11 w-11" /><div><h2 className="font-display text-lg font-bold">ثبّت بابلو على موبايلك</h2><p className="text-sm text-muted-foreground">يفتح زي التطبيق من الشاشة الرئيسية.</p></div></div>
      {standalone ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm"><Check className="h-4 w-4" /> بابلو متثبّت ومفتوح كتطبيق.</p>
      ) : canPrompt ? (
        <Btn variant="yellow" className="mt-4 w-full" data-testid="button-install" onClick={async () => { const r = await install(); if (r === "accepted") toast({ title: "تمام، بابلو اتثبّت" }); }}>
          <Download className="h-5 w-5" /> ثبّت دلوقتي
        </Btn>
      ) : (
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-foreground/80" data-testid="text-install-fallback">
          <p className="text-muted-foreground">زرار التثبيت مش متاح في المتصفح ده دلوقتي. تقدر تثبّته بنفسك:</p>
          {isIOS ? (
            <p className="flex items-start gap-2"><Share className="mt-0.5 h-4 w-4 shrink-0" /> في Safari: دوس على زرار المشاركة، وبعدين «إضافة إلى الشاشة الرئيسية».</p>
          ) : (
            <p className="flex items-start gap-2"><MoreVertical className="mt-0.5 h-4 w-4 shrink-0" /> في Chrome: افتح القايمة (التلات نقط فوق)، واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function Account({ profile }: { profile: Profile }) {
  const onboarding = !profile.onboarded;
  const { user } = useUser();
  const config = useConfig();
  const summary = useSummary();
  const update = useUpdateProfile();
  const qc = useQueryClient();
  const invalidate = useInvalidateRides();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [f, setF] = useState<Form>({ name: profile.name, phone: profile.phone, role: profile.role, province: profile.province, vehicle: profile.vehicle, vehicleType: profile.vehicleType, plate: profile.plate, driverTermsAccepted: profile.driverTermsAccepted });
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverErr, setServerErr] = useState("");
  const filled = useRef(false);

  useEffect(() => {
    if (filled.current || !user) return;
    filled.current = true;
    if (!profile.name && user.fullName) setF((x) => ({ ...x, name: user.fullName ?? "" }));
  }, [user, profile.name]);

  const locked = !onboarding && (summary.data?.active ?? 0) > 0;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((x) => ({ ...x, [k]: v })); setErrs((e) => ({ ...e, [k]: undefined })); };

  function submit(e: React.FormEvent) {
    e.preventDefault(); setServerErr("");
    const er: typeof errs = {};
    const name = f.name.trim(), phone = f.phone.replace(/\s|-/g, "");
    if (name.length < 2 || name.length > 80) er.name = "الاسم لازم يكون من ٢ لـ ٨٠ حرف";
    if (!PHONE.test(phone)) er.phone = "اكتب رقم موبايل مصري صحيح، زي 01012345678";
    if (!f.province) er.province = "اختار محافظتك";
    if (f.role === "driver" && f.vehicle.trim().length < 2) er.vehicle = "اكتب نوع العربية ولونها";
    if (f.role === "driver" && f.plate.trim().length < 2) er.plate = "اكتب رقم اللوحة";
    if (f.role === "driver" && !f.driverTermsAccepted) er.driverTermsAccepted = "وافق على إقرار النسخة التجريبية قبل تسجيل الكابتن";
    if (f.vehicle.length > 80) er.vehicle = "أقصى حد ٨٠ حرف";
    if (f.plate.length > 30) er.plate = "أقصى حد ٣٠ حرف";
    setErrs(er);
    if (Object.keys(er).length) return;
     update.mutate({ data: { name, phone, role: f.role, province: f.province, vehicle: f.vehicle.trim(), vehicleType: f.vehicleType, plate: f.plate.trim(), driverTermsAccepted: f.role === "driver" && f.driverTermsAccepted } }, {
      onSuccess: (p) => {
        qc.setQueryData(getGetProfileQueryKey(), p); invalidate();
        if (onboarding) { toast({ title: `أهلاً بيك يا ${p.name.split(" ")[0]}` }); setLocation("/book"); }
        else toast({ title: "اتحفظت بياناتك" });
      },
      onError: (err) => setServerErr(errorText(err)),
    });
  }

  const Err = ({ k }: { k: keyof Form }) => errs[k] ? <p className="mt-1 text-xs text-destructive">{errs[k]}</p> : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {onboarding ? (
        <div className="mb-8">
          <span className="checker block h-3 w-24 rounded-sm" />
          <h1 className="mt-4 font-display text-4xl font-black leading-tight">خطوة واحدة<br />وتبقى جاهز.</h1>
          <p className="mt-2 text-muted-foreground">عرّفنا بنفسك. هتركب ولا هتسوق؟</p>
        </div>
      ) : <h1 className="mb-8 font-display text-3xl font-black">حسابي</h1>}

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <form onSubmit={submit} noValidate className="space-y-5" data-testid="form-profile">
          {locked && <p className="flex items-start gap-2 rounded-2xl bg-accent px-4 py-3 text-sm" data-testid="text-profile-locked"><Lock className="mt-0.5 h-4 w-4 shrink-0" /> عندك رحلة شغالة دلوقتي، فمينفعش تعدّل بياناتك غير لما تخلص أو تتلغي.</p>}
          <fieldset disabled={locked || update.isPending} className="space-y-5 disabled:opacity-60">
            <div className="grid grid-cols-2 gap-3">
              {([["customer", "راكب", "عايز أطلب مشاوير", UserRound], ["driver", "كابتن", "عندي عربية وهسوق", CarFront]] as const).map(([v, l, d, Icon]) => (
                <button type="button" key={v} data-testid={`button-role-${v}`} onClick={() => set("role", v)}
                  className={cn("press rounded-3xl border-2 p-4 text-right transition-colors", f.role === v ? "border-[#10151d] bg-[#ffd000]" : "border-card-border bg-card hover:border-foreground/20")}>
                  <Icon className="h-6 w-6" /><p className="mt-3 font-display text-lg font-bold">{l}</p><p className="text-xs text-foreground/65">{d}</p>
                </button>
              ))}
            </div>
            <div><label className="mb-1.5 block text-sm font-semibold">الاسم</label><input data-testid="input-name" className={fieldCls} value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="اسمك زي ما الكابتن أو الراكب هيشوفه" /><Err k="name" /></div>
            <div><label className="mb-1.5 block text-sm font-semibold">رقم الموبايل</label><input data-testid="input-phone" dir="ltr" inputMode="tel" className={cn(fieldCls, "text-right font-num")} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01012345678" /><Err k="phone" /><p className="mt-1 text-xs text-muted-foreground">بيظهر للطرف التاني بس لما رحلة تتقبل.</p></div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">المحافظة</label>
              {config.isLoading ? <Skeleton className="h-12" /> : (
                <select data-testid="select-province" className={fieldCls} value={f.province} onChange={(e) => set("province", e.target.value)}>
                  <option value="">اختار محافظتك</option>
                  {config.data?.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <Err k="province" />
              {f.role === "driver" && <p className="mt-1 text-xs text-muted-foreground">هتشوف طلبات المحافظة دي بس.</p>}
            </div>
            {f.role === "driver" && <div>
              <p className="mb-2 text-sm font-semibold">نوع المركبة</p>
              <div className="grid grid-cols-2 gap-2">
                {([{ value: "car", label: "عربية", Icon: CarFront }, { value: "motorcycle", label: "موتوسيكل", Icon: Bike }] as const).map(({ value, label, Icon }) => (
                  <button type="button" key={value} data-testid={`button-vehicle-type-${value}`} aria-pressed={f.vehicleType === value} onClick={() => set("vehicleType", value)}
                    className={cn("press flex min-h-12 items-center gap-2 rounded-2xl border-2 px-4 text-sm font-bold transition-colors", f.vehicleType === value ? "border-[#10151d] bg-[#ffd000]" : "border-card-border bg-card hover:border-foreground/20")}>
                    <Icon className="h-5 w-5" />{label}
                  </button>
                ))}
              </div>
            </div>}
            <div className={cn("grid gap-3 sm:grid-cols-2", f.role !== "driver" && "opacity-70")}>
              <div><label className="mb-1.5 block text-sm font-semibold">{f.vehicleType === "motorcycle" ? "نوع الموتوسيكل ولونه" : "نوع العربية ولونها"} {f.role !== "driver" && <span className="font-normal text-muted-foreground">(للكباتن)</span>}</label><input data-testid="input-vehicle" className={fieldCls} value={f.vehicle} maxLength={80} onChange={(e) => set("vehicle", e.target.value)} placeholder={f.vehicleType === "motorcycle" ? "مثلاً: سكوتر أسود" : "مثلاً: هيونداي فيرنا فضي"} /><Err k="vehicle" /></div>
              <div><label className="mb-1.5 block text-sm font-semibold">رقم اللوحة {f.role !== "driver" && <span className="font-normal text-muted-foreground">(للكباتن)</span>}</label><input data-testid="input-plate" className={fieldCls} value={f.plate} maxLength={30} onChange={(e) => set("plate", e.target.value)} placeholder="مثلاً: س ط ر ٤٥٢٧" /><Err k="plate" /></div>
            </div>
            {f.role === "driver" && (
              <div className="rounded-2xl border border-card-border bg-card p-4">
                <p className="font-semibold">إقرار الكابتن للنسخة التجريبية</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">أؤكد صحة بياناتي، وأفهم أن التسجيل لا يعني اعتماد الكابتن أو السماح بنقل ركاب حقيقيين. هذه نسخة اختبار وليست موافقة قانونية نهائية أو تصريح تشغيل.</p>
                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                  <input data-testid="checkbox-driver-terms" type="checkbox" className="mt-1 h-4 w-4 accent-[#10151d]" checked={f.driverTermsAccepted} onChange={(e) => set("driverTermsAccepted", e.target.checked)} />
                  <span>قرأت إقرار التجربة وأوافق عليه</span>
                </label>
                <Err k="driverTermsAccepted" />
              </div>
            )}
          </fieldset>
          {serverErr && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" data-testid="text-profile-error">{serverErr}</p>}
          <Btn type="submit" variant={onboarding ? "yellow" : "dark"} className="h-14 w-full text-lg" data-testid="button-save-profile" disabled={locked || update.isPending}>
            {update.isPending && <Loader2 className="h-5 w-5 animate-spin" />} {onboarding ? "يلا نبدأ" : "احفظ التعديلات"}
          </Btn>
        </form>
        <aside className="space-y-4">
          {user?.primaryEmailAddress && <div className="rounded-2xl bg-muted p-4 text-sm"><p className="text-xs text-muted-foreground">داخل بـ</p><p className="font-num" dir="ltr">{user.primaryEmailAddress.emailAddress}</p></div>}
          {profile.role === "driver" && <div className="rounded-2xl border border-card-border bg-card p-4 text-sm">
            <p className="font-semibold">حالة اعتماد الكابتن</p>
            <p className="mt-1 text-muted-foreground">{profile.driverReviewStatus === "approved" ? "تم اعتماد الحساب." : profile.driverReviewStatus === "rejected" ? "الطلب مرفوض؛ راجع الإدارة." : profile.driverReviewStatus === "suspended" ? "الحساب موقوف مؤقتًا." : "الحساب بانتظار مراجعة الإدارة. قبول الرحلات الحقيقية غير متاح قبل الاعتماد."}</p>
          </div>}
          <PilotNotice compact text="نسخة تجريبية فقط: لا تستخدمها لنقل ركاب حقيقيين أو لتحصيل أموال. المدفوعات والتشغيل التجاري غير مفعّلين." />
          <InstallCard />
        </aside>
      </div>
    </div>
  );
}
