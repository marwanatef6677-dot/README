import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Bike, CarFront, Check, Download, ImagePlus, Loader2, Lock, MoreVertical, Share, UserRound } from "lucide-react";
import {
  getGetProfileQueryKey, getListDriverReviewsQueryKey,
  useCompleteDriverDocumentUpload, useCompleteProfilePhotoUpload,
  useGetWallet, useRequestDriverDocumentUpload, useRequestProfilePhotoUpload, useUpdateProfile,
} from "@workspace/api-client-react";
import type { DriverDocumentUploadRequestDocumentType } from "@workspace/api-client-react";
import type { Profile, ProfileInputRole } from "@workspace/api-client-react";
import { Btn, Monogram, PilotNotice, Skeleton } from "@/components/bits";
import { fieldCls } from "@/components/booking-form";
import { useConfig, useInvalidateRides, useSummary } from "@/hooks/use-pablo";
import { useInstall } from "@/hooks/use-install";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/lib/pablo";
import { cn } from "@/lib/utils";

const PHONE = /^(01[0125][0-9]{8}|\+201[0125][0-9]{8})$/;
type Form = {
  name: string; phone: string; role: ProfileInputRole; province: string; vehicle: string;
  vehicleType: "car" | "motorcycle"; plate: string; driverTermsAccepted: boolean; driverTermsSignature: string;
  customerAge18Attested: boolean; customerTermsAccepted: boolean; customerTermsSignature: string;
};
type FormErrors = Partial<Record<keyof Form | "vehiclePhoto" | "driverDocuments", string>>;
type UploadPurpose = "avatar" | "captain_vehicle" | DriverDocumentUploadRequestDocumentType;
const normalizeSignature = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
const DRIVER_DOCUMENTS = [
  { type: "driver_license_front", label: "رخصة القيادة — الوجه الأمامي", flag: "hasDriverLicenseFront" },
  { type: "driver_license_back", label: "رخصة القيادة — الوجه الخلفي", flag: "hasDriverLicenseBack" },
  { type: "vehicle_license_front", label: "رخصة المركبة — الوجه الأمامي", flag: "hasVehicleLicenseFront" },
  { type: "vehicle_license_back", label: "رخصة المركبة — الوجه الخلفي", flag: "hasVehicleLicenseBack" },
] as const;

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

function CaptainWallet() {
  const wallet = useGetWallet();
  if (wallet.isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  if (wallet.isError || !wallet.data) {
    return <div className="rounded-3xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">مش قادرين نجيب رصيد المحفظة دلوقتي.</div>;
  }

  return (
    <section className="rounded-3xl border border-card-border bg-card p-4" data-testid="section-captain-wallet">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">رصيد محفظة الكابتن</p>
          <p className="mt-1 font-num text-2xl font-black">{(wallet.data.balancePiasters / 100).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} جنيه</p>
        </div>
        <span className="rounded-full bg-[#ffd000]/25 px-2.5 py-1 text-[10px] font-bold">عمولات وتعويضات</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">الرصيد يغطي عمولات الرحلات ويشمل تعويض بابلو عن أكواد الخصم بعد اكتمال الرحلة. لا يمكن سحبه نقدًا.</p>
      {wallet.data.ledger.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-bold">آخر الحركات</p>
          {wallet.data.ledger.slice(0, 5).map((entry, index) => (
            <div key={`${entry.createdAt}-${index}`} className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-medium">{entry.note}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString("ar-EG")}</p>
              </div>
              <strong className={entry.amountPiasters >= 0 ? "shrink-0 font-num text-emerald-700" : "shrink-0 font-num text-destructive"}>
                {entry.amountPiasters > 0 ? "+" : ""}{(entry.amountPiasters / 100).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج
              </strong>
            </div>
          ))}
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
  const requestDriverDocumentUpload = useRequestDriverDocumentUpload();
  const completeDriverDocumentUpload = useCompleteDriverDocumentUpload();
  const requestPhotoUpload = useRequestProfilePhotoUpload();
  const completePhotoUpload = useCompleteProfilePhotoUpload();
  const qc = useQueryClient();
  const invalidate = useInvalidateRides();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [f, setF] = useState<Form>({
    name: profile.name, phone: profile.phone, role: profile.role, province: profile.province,
    vehicle: profile.vehicle, vehicleType: profile.vehicleType, plate: profile.plate,
    driverTermsAccepted: profile.driverTermsAccepted, driverTermsSignature: "",
    customerAge18Attested: profile.customerTermsAccepted,
    customerTermsAccepted: profile.customerTermsAccepted,
    customerTermsSignature: "",
  });
  const [errs, setErrs] = useState<FormErrors>({});
  const [serverErr, setServerErr] = useState("");
  const [photoBusy, setPhotoBusy] = useState<UploadPurpose | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoRevision, setPhotoRevision] = useState(0);
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
    const er: FormErrors = {};
    const name = f.name.trim(), phone = f.phone.replace(/\s|-/g, "");
    if (name.length < 2 || name.length > 80) er.name = "الاسم لازم يكون من ٢ لـ ٨٠ حرف";
    if (!PHONE.test(phone)) er.phone = "اكتب رقم موبايل مصري صحيح، زي 01012345678";
    if (!f.province) er.province = "اختار محافظتك";
    if (f.role === "driver" && f.vehicle.trim().length < 2) er.vehicle = "اكتب نوع العربية ولونها";
    if (f.role === "driver" && f.plate.trim().length < 2) er.plate = "اكتب رقم اللوحة";
    if (f.role === "driver" && !profile.hasCaptainVehiclePhoto) er.vehiclePhoto = "ارفع صورة ليك واقف جنب عربيتك أو موتوسيكل قبل تسجيل الكابتن";
    if (f.role === "driver" && !f.driverTermsAccepted) er.driverTermsAccepted = "وافق على إقرار النسخة التجريبية قبل تسجيل الكابتن";
    if (f.role === "driver" && DRIVER_DOCUMENTS.some((doc) => !profile[doc.flag])) {
      er.driverDocuments = "ارفع صور الوجهين لرخصة القيادة ورخصة المركبة قبل إرسال طلب الاعتماد.";
    }
    if (f.role === "driver" && !profile.driverTermsAccepted
      && normalizeSignature(f.driverTermsSignature) !== normalizeSignature(name)) {
      er.driverTermsSignature = "اكتب اسمك المسجل بالكامل كتوقيع.";
    }
    if (f.role === "customer" && !profile.customerTermsAccepted) {
      if (!f.customerAge18Attested) er.customerAge18Attested = "أكد أن عمرك ١٨ سنة أو أكثر.";
      if (!f.customerTermsAccepted) er.customerTermsAccepted = "وافق على شروط استخدام بابلو.";
      if (normalizeSignature(f.customerTermsSignature) !== normalizeSignature(name)) {
        er.customerTermsSignature = "اكتب اسمك المسجل بالكامل كتوقيع.";
      }
    }
    if (f.vehicle.length > 80) er.vehicle = "أقصى حد ٨٠ حرف";
    if (f.plate.length > 30) er.plate = "أقصى حد ٣٠ حرف";
    setErrs(er);
    if (Object.keys(er).length) return;
     const customerTerms = f.role === "customer" && !profile.customerTermsAccepted ? {
       customerAge18Attested: f.customerAge18Attested,
       customerTermsAccepted: f.customerTermsAccepted,
       customerTermsSignature: f.customerTermsSignature.trim(),
     } : {};
     const driverTerms = f.role === "driver" && !profile.driverTermsAccepted
       ? { driverTermsSignature: f.driverTermsSignature.trim() }
       : {};
     update.mutate({ data: { name, phone, role: f.role, province: f.province, vehicle: f.vehicle.trim(), vehicleType: f.vehicleType, plate: f.plate.trim(), driverTermsAccepted: f.role === "driver" && f.driverTermsAccepted, ...driverTerms, ...customerTerms } }, {
      onSuccess: (p) => {
        qc.setQueryData(getGetProfileQueryKey(), p); invalidate();
         if (onboarding || (f.role === "customer" && p.customerTermsAccepted)) { toast({ title: `أهلاً بيك يا ${p.name.split(" ")[0]}` }); setLocation("/book"); }
        else toast({ title: "اتحفظت بياناتك" });
      },
      onError: (err) => setServerErr(errorText(err)),
    });
  }

  async function uploadPhoto(file: File | undefined, purpose: "avatar" | "captain_vehicle") {
    if (!file) return;
    setPhotoError("");
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("اختار صورة بصيغة JPG أو PNG أو WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("حجم الصورة لازم يكون ٥ ميجابايت أو أقل.");
      return;
    }
    setPhotoBusy(purpose);
    try {
      const upload = await requestPhotoUpload.mutateAsync({ data: { purpose, name: file.name, size: file.size, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" } });
      const response = await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("ماقدرناش نرفع الصورة. حاول تاني.");
      await completePhotoUpload.mutateAsync({ data: { purpose, objectPath: upload.objectPath } });
      await qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      if (purpose === "captain_vehicle") await qc.invalidateQueries({ queryKey: getListDriverReviewsQueryKey() });
      setPhotoRevision((current) => current + 1);
    } catch (error) {
      setPhotoError(errorText(error, "ماقدرناش نرفع الصورة. حاول تاني."));
    } finally {
      setPhotoBusy(null);
    }
  }

  async function uploadDriverDocument(file: File | undefined, documentType: DriverDocumentUploadRequestDocumentType) {
    if (!file) return;
    setPhotoError("");
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("اختار صورة JPG أو PNG أو WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("حجم كل صورة لازم يكون ٥ ميجابايت أو أقل.");
      return;
    }
    setPhotoBusy(documentType);
    try {
      const upload = await requestDriverDocumentUpload.mutateAsync({
        data: { documentType, size: file.size, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" },
      });
      const response = await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("ماقدرناش نرفع المستند. حاول تاني.");
      await completeDriverDocumentUpload.mutateAsync({ data: { documentType, objectPath: upload.objectPath } });
      await qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      await qc.invalidateQueries({ queryKey: getListDriverReviewsQueryKey() });
      setPhotoRevision((current) => current + 1);
    } catch (error) {
      setPhotoError(errorText(error, "ماقدرناش نرفع المستند. حاول تاني."));
    } finally {
      setPhotoBusy(null);
    }
  }

  const Err = ({ k }: { k: keyof Form }) => errs[k] ? <p className="mt-1 text-xs text-destructive">{errs[k]}</p> : null;
  const canSubmitTermsWhileLocked = (f.role === "customer" && !profile.customerTermsAccepted
    && f.customerAge18Attested && f.customerTermsAccepted
    && normalizeSignature(f.customerTermsSignature) === normalizeSignature(f.name))
    || (f.role === "driver" && !profile.driverTermsAccepted
      && f.driverTermsAccepted
      && normalizeSignature(f.driverTermsSignature) === normalizeSignature(f.name)
      && DRIVER_DOCUMENTS.every((doc) => profile[doc.flag]));

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
            <section className="rounded-2xl border border-card-border bg-card p-4" data-testid="section-profile-photos">
              <div className="flex items-start gap-3">
                {profile.hasAvatarPhoto ? <img src={`/api/storage/profile-photos/me/avatar?v=${photoRevision}`} alt="صورتك الشخصية" className="h-14 w-14 rounded-2xl object-cover" data-testid="img-profile-avatar" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-muted"><UserRound className="h-6 w-6 text-muted-foreground" /></span>}
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold">صور الحساب</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground" data-testid="text-avatar-privacy">صورة الحساب اختيارية، وتظهر لكل مستخدمي بابلو المسجلين الدخول.</p>
                  <label className="press mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-card-border bg-background px-3 text-sm font-bold" data-testid="label-avatar-upload">
                    <ImagePlus className="h-4 w-4" /> {profile.hasAvatarPhoto ? "غيّر الصورة" : "ارفع صورة اختيارية"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoBusy !== null || locked} onChange={(event) => { void uploadPhoto(event.currentTarget.files?.[0], "avatar"); event.currentTarget.value = ""; }} data-testid="input-avatar-photo" />
                  </label>
                </div>
              </div>
              {f.role === "driver" && <div className="mt-4 border-t border-border/70 pt-4">
                <div className="flex items-start gap-3">
                  {profile.hasCaptainVehiclePhoto ? <img src={`/api/storage/profile-photos/me/vehicle?v=${photoRevision}`} alt="صورة الكابتن مع المركبة" className="h-20 w-28 shrink-0 rounded-xl object-cover" data-testid="img-captain-vehicle-photo" /> : <span className="grid h-20 w-28 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-muted"><CarFront className="h-7 w-7 text-muted-foreground" /></span>}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">صورة الكابتن مع المركبة <span className="text-destructive">*</span></h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground" data-testid="text-captain-photo-privacy">الصورة تظهر لكل مستخدمي بابلو المسجلين، وتستخدمها الإدارة لمراجعة حسابك.</p>
                    <label className="press mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#ffd000] px-3 text-sm font-bold text-[#10151d]" data-testid="label-captain-photo-upload">
                      <ImagePlus className="h-4 w-4" /> {profile.hasCaptainVehiclePhoto ? "غيّر صورة المركبة" : "ارفع صورة مطلوبة"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoBusy !== null || locked} onChange={(event) => { void uploadPhoto(event.currentTarget.files?.[0], "captain_vehicle"); event.currentTarget.value = ""; }} data-testid="input-captain-vehicle-photo" />
                    </label>
                    {photoBusy === "captain_vehicle" && <p className="mt-2 text-xs text-muted-foreground" role="status" data-testid="status-captain-photo-upload">جاري رفع الصورة...</p>}
                  </div>
                </div>
                {!profile.hasCaptainVehiclePhoto && <p className="mt-3 text-xs font-semibold text-amber-800" data-testid="text-captain-photo-required">لازم ترفع الصورة قبل حفظ التسجيل ككابتن.</p>}
              </div>}
              {f.role === "driver" && <section className="mt-4 border-t border-border/70 pt-4" data-testid="section-driver-documents">
                <div>
                  <h3 className="font-semibold">رخصة القيادة ورخصة المركبة <span className="text-destructive">*</span></h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">ارفع الوجه الأمامي والخلفي لكل رخصة. الصور محفوظة في مساحة خاصة ومتاحة للإدارة فقط للمراجعة وإعادة المراجعة، ولا تظهر للعملاء أو للكباتن الآخرين.</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {DRIVER_DOCUMENTS.map((doc) => {
                    const uploaded = profile[doc.flag];
                    return (
                      <div key={doc.type} className="rounded-xl border border-border bg-background p-3" data-testid={`driver-document-${doc.type}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{doc.label}</p>
                          <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", uploaded ? "bg-emerald-700/10 text-emerald-800" : "bg-amber-700/10 text-amber-800")}>
                            {uploaded ? "تم الرفع" : "مطلوب"}
                          </span>
                        </div>
                        <label className="press mt-2 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-card-border bg-card px-3 text-xs font-bold">
                          <ImagePlus className="h-4 w-4" /> {uploaded ? "استبدال الصورة" : "اختيار صورة"}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoBusy !== null || locked} onChange={(event) => { void uploadDriverDocument(event.currentTarget.files?.[0], doc.type); event.currentTarget.value = ""; }} data-testid={`input-driver-document-${doc.type}`} />
                        </label>
                        {photoBusy === doc.type && <p className="mt-2 text-[11px] text-muted-foreground" role="status">جاري رفع الصورة...</p>}
                      </div>
                    );
                  })}
                </div>
                {errs.driverDocuments && <p className="mt-2 text-xs text-destructive" data-testid="error-driver-documents">{errs.driverDocuments}</p>}
              </section>}
              {photoBusy === "avatar" && <p className="mt-2 text-xs text-muted-foreground" role="status" data-testid="status-avatar-upload">جاري رفع الصورة...</p>}
              {photoError && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive" role="alert" data-testid="text-photo-upload-error">{photoError}</p>}
              <p className="mt-3 text-[11px] text-muted-foreground" data-testid="text-photo-file-requirements">الصور المسموح بها JPG أو PNG أو WebP، بحد أقصى ٥ ميجابايت.</p>
            </section>
            <div className="grid grid-cols-2 gap-3">
              {([["customer", "راكب", "عايز أطلب مشاوير", UserRound], ["driver", "كابتن", "عندي عربية وهسوق", CarFront]] as const).map(([v, l, d, Icon]) => (
                <button type="button" key={v} data-testid={`button-role-${v}`} onClick={() => set("role", v)}
                  className={cn("press rounded-3xl border-2 p-4 text-right transition-colors", f.role === v ? "border-[#10151d] bg-[#ffd000]" : "border-card-border bg-card hover:border-foreground/20")}>
                  <Icon className="h-6 w-6" /><p className="mt-3 font-display text-lg font-bold">{l}</p><p className="text-xs text-foreground/65">{d}</p>
                </button>
              ))}
            </div>
            <div><label className="mb-1.5 block text-sm font-semibold">الاسم</label><input data-testid="input-name" className={fieldCls} value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="اسمك زي ما الكابتن أو الراكب هيشوفه" /><Err k="name" /></div>
            <div><label className="mb-1.5 block text-sm font-semibold">رقم الموبايل المصري <span className="text-destructive">*</span></label><input data-testid="input-phone" dir="ltr" inputMode="tel" autoComplete="tel" required className={cn(fieldCls, "text-right font-num")} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01012345678" /><Err k="phone" /><p className="mt-1 text-xs text-muted-foreground">مطلوب لكل حساب قبل استخدام الرحلات، وبيظهر للطرف التاني بعد قبولها.</p></div>
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
          </fieldset>
          {f.role === "driver" && !profile.driverTermsAccepted && <section className="space-y-4 rounded-2xl border border-[#ffd000]/50 bg-[#ffd000]/10 p-4" data-testid="section-driver-terms">
            <div>
              <h2 className="font-display text-lg font-bold">إقرار الكابتن</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">اقرأ <Link href="/driver-terms" className="font-bold underline" data-testid="link-driver-terms">إقرار الكابتن والمستندات</Link> قبل الموافقة.</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input data-testid="checkbox-driver-terms" type="checkbox" className="mt-1 h-4 w-4 accent-[#10151d]" checked={f.driverTermsAccepted} onChange={(e) => set("driverTermsAccepted", e.target.checked)} />
              <span>أقر أن بياناتي والمستندات التي رفعتها تخصني وصحيحة، وأوافق على مراجعتها إداريًا. أفهم أن رفعها لا يعني اعتماد الحساب أو السماح بقبول الطلبات.</span>
            </label>
            <Err k="driverTermsAccepted" />
            <div>
              <label htmlFor="driver-terms-signature" className="mb-1.5 block text-sm font-semibold">اكتب اسمك المسجل كتوقيع إلكتروني</label>
              <input id="driver-terms-signature" data-testid="input-driver-terms-signature" className={fieldCls} autoComplete="name" maxLength={80} value={f.driverTermsSignature} onChange={(e) => set("driverTermsSignature", e.target.value)} placeholder={f.name || "اسمك الكامل"} />
              <Err k="driverTermsSignature" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">سيُحفظ الاسم المكتوب ووقت الموافقة وإصدار الإقرار. هذا سجل داخل التطبيق وليس تأكيدًا على الحجية القانونية للتوقيع.</p>
          </section>}
          {f.role === "driver" && profile.driverTermsAccepted && <div className="rounded-2xl border border-emerald-700/20 bg-emerald-700/5 p-4 text-sm" data-testid="text-driver-terms-signed">
            <p className="font-semibold">تم تسجيل إقرار الكابتن.</p>
            <Link href="/driver-terms" className="mt-2 inline-block text-xs font-bold underline">عرض الإقرار</Link>
          </div>}
          {f.role === "customer" && !profile.customerTermsAccepted && <section className="space-y-4 rounded-2xl border border-[#ffd000]/50 bg-[#ffd000]/10 p-4" data-testid="section-customer-terms">
            <div>
              <h2 className="font-display text-lg font-bold">اتفاق استخدام العميل</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">اقرأ <Link href="/terms" className="font-bold underline" data-testid="link-customer-terms">شروط استخدام بابلو</Link> قبل الموافقة.</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" data-testid="checkbox-customer-age" className="mt-1 h-4 w-4 accent-[#10151d]" checked={f.customerAge18Attested} onChange={(e) => set("customerAge18Attested", e.target.checked)} />
              <span>أقرّ أن عمري ١٨ سنة أو أكثر وأن البيانات التي أدخلتها صحيحة.</span>
            </label>
            <Err k="customerAge18Attested" />
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" data-testid="checkbox-customer-terms" className="mt-1 h-4 w-4 accent-[#10151d]" checked={f.customerTermsAccepted} onChange={(e) => set("customerTermsAccepted", e.target.checked)} />
              <span>قرأت شروط استخدام بابلو وأوافق عليها.</span>
            </label>
            <Err k="customerTermsAccepted" />
            <div>
              <label htmlFor="customer-terms-signature" className="mb-1.5 block text-sm font-semibold">اكتب اسمك المسجل كتوقيع إلكتروني</label>
              <input id="customer-terms-signature" data-testid="input-customer-terms-signature" className={fieldCls} autoComplete="name" maxLength={80} value={f.customerTermsSignature} onChange={(e) => set("customerTermsSignature", e.target.value)} placeholder={f.name || "اسمك الكامل"} />
              <Err k="customerTermsSignature" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">سيُحفظ الاسم المكتوب وإقرار السن ووقت الموافقة وإصدار الشروط. هذا إقرار ذاتي ولا يتضمن تحققًا من تاريخ الميلاد أو الهوية.</p>
          </section>}
          {f.role === "customer" && profile.customerTermsAccepted && <div className="rounded-2xl border border-emerald-700/20 bg-emerald-700/5 p-4 text-sm" data-testid="text-customer-terms-signed">
            <p className="font-semibold">تم تسجيل موافقتك على شروط العميل.</p>
            {profile.customerTermsAcceptedAt && <p className="mt-1 text-xs text-muted-foreground">وقت الموافقة: {new Date(profile.customerTermsAcceptedAt).toLocaleString("ar-EG")}</p>}
            <Link href="/terms" className="mt-2 inline-block text-xs font-bold underline">عرض شروط الاستخدام</Link>
          </div>}
          {serverErr && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" data-testid="text-profile-error">{serverErr}</p>}
          <Btn type="submit" variant={onboarding ? "yellow" : "dark"} className="h-14 w-full text-lg" data-testid="button-save-profile" disabled={(locked && !canSubmitTermsWhileLocked) || update.isPending || photoBusy !== null || (f.role === "driver" && !profile.hasCaptainVehiclePhoto)}>
            {update.isPending && <Loader2 className="h-5 w-5 animate-spin" />} {onboarding ? "يلا نبدأ" : "احفظ التعديلات"}
          </Btn>
        </form>
        <aside className="space-y-4">
          {user?.primaryEmailAddress && <div className="rounded-2xl bg-muted p-4 text-sm"><p className="text-xs text-muted-foreground">داخل بـ</p><p className="font-num" dir="ltr">{user.primaryEmailAddress.emailAddress}</p></div>}
          {profile.role === "driver" && <div className="rounded-2xl border border-card-border bg-card p-4 text-sm">
            <p className="font-semibold">حالة اعتماد الكابتن</p>
            <p className="mt-1 text-muted-foreground">{profile.driverReviewStatus === "approved" ? "تم اعتماد الحساب." : profile.driverReviewStatus === "rejected" ? "الطلب مرفوض؛ راجع الإدارة." : profile.driverReviewStatus === "suspended" ? "الحساب موقوف مؤقتًا." : "الحساب بانتظار مراجعة الإدارة. قبول الرحلات الحقيقية غير متاح قبل الاعتماد."}</p>
          </div>}
          {profile.role === "driver" && <CaptainWallet />}
          <PilotNotice compact text="نسخة تجريبية فقط: لا تستخدمها لنقل ركاب حقيقيين أو لتحصيل أموال. المدفوعات والتشغيل التجاري غير مفعّلين." />
          <InstallCard />
        </aside>
      </div>
    </div>
  );
}
