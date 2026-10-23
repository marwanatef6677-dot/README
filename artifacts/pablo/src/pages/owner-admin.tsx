import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListDriverReviewsQueryKey,
  useListDriverReviews,
  useReviewDriver,
  type DriverReview,
  type DriverReviewInput,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Camera,
  FileCheck2,
  FlaskConical,
  IdCard,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Btn, EmptyState, ErrorState, PilotNotice, Skeleton } from "@/components/bits";
import { SupportTicketsAdmin } from "@/components/support-tickets-admin";
import { PabloFeedbackAdmin } from "@/components/pablo-feedback-admin";
import { errorText } from "@/lib/pablo";

const CHECKLIST = [
  { key: "captainPhotoVerified", label: "مراجعة صورة الكابتن مع المركبة", icon: Camera },
  { key: "identityVerified", label: "التحقق من الهوية", icon: IdCard },
  { key: "drivingLicenseVerified", label: "رخصة القيادة", icon: FileCheck2 },
  { key: "vehicleVerified", label: "مطابقة بيانات المركبة", icon: ClipboardCheck },
  { key: "workPermitVerified", label: "تصريح العمل", icon: FileCheck2 },
  { key: "socialInsuranceVerified", label: "التأمينات الاجتماعية", icon: ShieldCheck },
  { key: "backgroundCheckCompleted", label: "اكتمال مراجعة الخلفية", icon: ShieldAlert },
  { key: "vehicleRequirementsVerified", label: "متطلبات المركبة", icon: CheckCircle2 },
  { key: "operatorLicenseVerified", label: "ترخيص المشغّل", icon: BadgeCheck },
  { key: "randomTestProcessConfirmed", label: "تأكيد إجراءات الاختبار العشوائي", icon: ClipboardCheck },
] as const;

type ChecklistKey = (typeof CHECKLIST)[number]["key"];
type Draft = Pick<DriverReviewInput, ChecklistKey | "note">;

const makeDraft = (review: DriverReview): Draft => ({
  note: review.driverReviewNote ?? "",
  captainPhotoVerified: review.captainPhotoVerified && review.captainVehiclePhotoAvailable,
  identityVerified: review.identityVerified,
  drivingLicenseVerified: review.drivingLicenseVerified,
  vehicleVerified: review.vehicleVerified,
  workPermitVerified: review.workPermitVerified,
  socialInsuranceVerified: review.socialInsuranceVerified,
  backgroundCheckCompleted: review.backgroundCheckCompleted,
  vehicleRequirementsVerified: review.vehicleRequirementsVerified,
  operatorLicenseVerified: review.operatorLicenseVerified,
  randomTestProcessConfirmed: review.randomTestProcessConfirmed,
});

const STATUS: Record<DriverReview["driverReviewStatus"], { label: string; style: string }> = {
  pending: { label: "بانتظار المراجعة", style: "border-amber-700/20 bg-[#ffd000]/25 text-[#665000]" },
  approved: { label: "تمت الموافقة", style: "border-emerald-700/20 bg-emerald-700/10 text-emerald-800" },
  rejected: { label: "مرفوض", style: "border-rose-700/20 bg-rose-700/10 text-rose-800" },
  suspended: { label: "موقوف", style: "border-foreground/15 bg-muted text-muted-foreground" },
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function OwnerAdmin() {
  const queryClient = useQueryClient();
  const reviewsQuery = useListDriverReviews({
    query: { queryKey: getListDriverReviewsQueryKey(), refetchInterval: 10000 },
  });
  const reviewMutation = useReviewDriver();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [feedback, setFeedback] = useState<{ id: string; tone: "success" | "error"; text: string } | null>(null);

  const reviews = reviewsQuery.data ?? [];
  const pendingCount = reviews.filter((review) => review.driverReviewStatus === "pending").length;
  const setDraftField = <K extends keyof Draft>(id: string, key: K, value: Draft[K]) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? makeDraft(reviews.find((review) => review.id === id)!)), [key]: value },
    }));
  };

  const submitReview = (review: DriverReview, decision: DriverReviewInput["decision"]) => {
    const draft = drafts[review.id] ?? makeDraft(review);
    if (decision === "approved" && (!review.driverTermsAccepted || CHECKLIST.some(({ key }) => !draft[key]))) return;
    const note = draft.note.trim();
    if (note.length > 500) {
      setFeedback({ id: review.id, tone: "error", text: "الملاحظة لازم تكون ٥٠٠ حرف أو أقل." });
      return;
    }
    setFeedback(null);
    const data: DriverReviewInput = {
      decision,
      note,
      captainPhotoVerified: draft.captainPhotoVerified,
      identityVerified: draft.identityVerified,
      drivingLicenseVerified: draft.drivingLicenseVerified,
      vehicleVerified: draft.vehicleVerified,
      workPermitVerified: draft.workPermitVerified,
      socialInsuranceVerified: draft.socialInsuranceVerified,
      backgroundCheckCompleted: draft.backgroundCheckCompleted,
      vehicleRequirementsVerified: draft.vehicleRequirementsVerified,
      operatorLicenseVerified: draft.operatorLicenseVerified,
      randomTestProcessConfirmed: draft.randomTestProcessConfirmed,
    };
    reviewMutation.mutate(
      { id: review.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDriverReviewsQueryKey() });
          setFeedback({
            id: review.id,
            tone: "success",
            text: decision === "approved" ? "تم اعتماد مراجعة الكابتن." : decision === "rejected" ? "تم تسجيل رفض الطلب." : "تم تسجيل إيقاف الحساب.",
          });
          setDrafts((current) => {
            const next = { ...current };
            delete next[review.id];
            return next;
          });
        },
        onError: () => setFeedback({ id: review.id, tone: "error", text: "ماقدرناش نحفظ المراجعة. راجع الاتصال وحاول تاني." }),
      },
    );
  };

  return (
    <main dir="rtl" className="mx-auto min-h-[100dvh] w-full max-w-5xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
      <header className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#10151d]/10 bg-[#10151d] p-5 text-[#f6f1e4] shadow-[0_18px_45px_-28px_rgba(16,21,29,.7)] sm:p-8">
        <div className="absolute -left-8 -top-12 h-48 w-48 rounded-full border-[22px] border-[#ffd000]/10" aria-hidden />
        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd000]/30 bg-[#ffd000]/10 px-3 py-1.5 text-xs font-semibold text-[#ffd000]">
              <FlaskConical className="h-3.5 w-3.5" /> إدارة التجربة
            </div>
            <p className="mb-1 text-sm text-[#f6f1e4]/65">بابلو · تشغيل تجريبي</p>
            <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl">مراجعة حسابات الكباتن</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#f6f1e4]/70">
              راجع بيانات كل كابتن وبنود التحقق قبل تسجيل قرار المراجعة.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:min-w-44">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffd000] text-[#10151d]"><Clock3 className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-[#f6f1e4]/60">طلبات بانتظار المراجعة</p>
              <p className="font-num mt-1 text-2xl font-bold text-[#ffd000]" data-testid="text-pending-count">{pendingCount}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-7">
        <PilotNotice text="دي واجهة مراجعة إدارية تجريبية فقط، ومش شهادة أو اعتماد قانوني. الموافقة هنا لا تعني جاهزية تشغيل فعلية؛ مفيش رحلات حقيقية أو مدفوعات في النسخة دي." />
      </div>

      <SupportTicketsAdmin />
      <PabloFeedbackAdmin />

      <section aria-labelledby="review-queue-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-muted-foreground">قائمة المراجعة</p>
            <h2 id="review-queue-heading" className="mt-1 font-display text-2xl font-black">طلبات الكباتن</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-auto-refresh">
            <RefreshCw className="h-3.5 w-3.5" /> تحديث تلقائي كل ١٠ ثوانٍ
          </div>
        </div>

        {reviewsQuery.isLoading ? (
          <div className="space-y-4" aria-label="جاري تحميل الطلبات" data-testid="state-loading">
            {[0, 1].map((item) => <div key={item} className="rounded-3xl border border-card-border bg-card p-5">
              <Skeleton className="h-7 w-48" /><Skeleton className="mt-4 h-16 w-full" /><Skeleton className="mt-4 h-48 w-full" />
            </div>)}
          </div>
        ) : reviewsQuery.isError ? (
          <ErrorState message={errorText(reviewsQuery.error)} onRetry={() => void reviewsQuery.refetch()} />
        ) : reviews.length === 0 ? (
          <EmptyState title="مفيش طلبات للمراجعة" body="لما يوصل طلب كابتن جديد، هتلاقي بياناته هنا. القائمة بتتحدّث تلقائيًا." />
        ) : (
          <div className="space-y-5">
            {reviews.map((review) => {
              const draft = drafts[review.id] ?? makeDraft(review);
              const verifiedCount = CHECKLIST.filter(({ key }) => draft[key]).length;
              const canApprove = verifiedCount === CHECKLIST.length && review.driverTermsAccepted && review.captainVehiclePhotoAvailable;
              const isMutatingThis = reviewMutation.isPending && reviewMutation.variables?.id === review.id;
              const reviewDate = formatDate(review.driverReviewedAt);
              const status = STATUS[review.driverReviewStatus];
              return (
                <article key={review.id} className="overflow-hidden rounded-[1.75rem] border border-card-border bg-card shadow-[0_1px_0_hsl(var(--foreground)/.04)]" data-testid={`card-driver-review-${review.id}`}>
                  <div className="border-b border-border/70 bg-muted/45 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#10151d] text-[#ffd000]"><UserRound className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-xl font-extrabold" data-testid={`text-driver-name-${review.id}`}>{review.name}</h3>
                          <p className="mt-1 font-num text-sm text-muted-foreground" dir="ltr" data-testid={`text-driver-phone-${review.id}`}>{review.phone}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.style}`} data-testid={`status-driver-review-${review.id}`}>
                        {review.driverReviewStatus === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <InfoTile label="المحافظة" value={review.province} />
                       <InfoTile label="نوع المركبة" value={review.vehicleType === "motorcycle" ? "موتوسيكل" : "عربية"} />
                       <InfoTile label="المركبة" value={review.vehicle || "غير مسجل"} />
                      <InfoTile label="رقم اللوحة" value={review.plate || "غير مسجل"} />
                      <InfoTile label="موافقة الشروط" value={review.driverTermsAccepted ? "وافق عليها" : "لم يوافق"} alert={!review.driverTermsAccepted} />
                    </div>
                    <section className="mt-4 rounded-2xl border border-border/75 bg-card p-3" data-testid={`section-captain-photo-${review.id}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold">صورة الكابتن مع المركبة</h4>
                          <p className="mt-1 text-xs text-muted-foreground">صورة خاصة للمراجعة الإدارية.</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${review.captainVehiclePhotoAvailable ? "bg-emerald-700/10 text-emerald-800" : "bg-amber-700/10 text-amber-800"}`} data-testid={`status-captain-photo-${review.id}`}>
                          {review.captainVehiclePhotoAvailable ? "متاحة للمراجعة" : "لم تُرفع"}
                        </span>
                      </div>
                      {review.captainVehiclePhotoAvailable ? (
                        <a href={`/api/storage/admin/drivers/${encodeURIComponent(review.id)}/vehicle-photo`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl" data-testid={`link-captain-photo-${review.id}`}>
                          <img src={`/api/storage/admin/drivers/${encodeURIComponent(review.id)}/vehicle-photo`} alt={`صورة ${review.name} مع المركبة`} className="max-h-72 w-full bg-muted object-contain" data-testid={`img-captain-photo-${review.id}`} onError={(event) => { event.currentTarget.hidden = true; }} />
                        </a>
                      ) : (
                        <p className="rounded-xl border border-dashed border-border bg-muted/45 px-3 py-5 text-center text-sm text-muted-foreground" data-testid={`text-captain-photo-missing-${review.id}`}>لا توجد صورة لمراجعتها حتى الآن.</p>
                      )}
                    </section>
                    {reviewDate && <p className="mt-3 text-xs text-muted-foreground" data-testid={`text-review-date-${review.id}`}>آخر مراجعة: {reviewDate}</p>}
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-display text-lg font-bold">قائمة التحقق</h4>
                          <p className="mt-1 text-xs text-muted-foreground">لازم تراجع وتؤكد البنود العشرة كلها قبل تفعيل الموافقة.</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 font-num text-xs font-bold ${canApprove ? "bg-emerald-700/10 text-emerald-800" : "bg-muted text-muted-foreground"}`} data-testid={`text-checklist-progress-${review.id}`}>
                        {verifiedCount} / 10 مكتمل
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CHECKLIST.map(({ key, label, icon: Icon }) => {
                        const checked = draft[key];
                        return (
                          <label key={key} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${checked ? "border-emerald-700/25 bg-emerald-700/[0.055]" : "border-border bg-background/50 hover:bg-muted/60"}`} data-testid={`check-row-${key}-${review.id}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => setDraftField(review.id, key, event.target.checked)}
                               disabled={isMutatingThis || (key === "captainPhotoVerified" && !review.captainVehiclePhotoAvailable)}
                              className="h-4 w-4 accent-[#1f7a5f]"
                              data-testid={`checkbox-${key}-${review.id}`}
                            />
                            <Icon className={`h-4 w-4 shrink-0 ${checked ? "text-emerald-700" : "text-muted-foreground"}`} />
                            <span className="flex-1 text-sm font-medium">{label}</span>
                            {checked && <Check className="h-4 w-4 text-emerald-700" />}
                          </label>
                        );
                      })}
                    </div>

                    {!review.driverTermsAccepted && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-800/20 bg-[#ffd000]/15 p-3 text-sm leading-6 text-[#665000]" data-testid={`notice-terms-${review.id}`}>
                        <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                        <span>الموافقة غير متاحة قبل قبول الكابتن لشروط السائق.</span>
                      </div>
                    )}

                    <label className="mt-4 block text-sm font-bold" htmlFor={`review-note-${review.id}`}>ملاحظة المراجعة <span className="font-normal text-muted-foreground">(اختياري)</span></label>
                    <textarea
                      id={`review-note-${review.id}`}
                      value={draft.note}
                      onChange={(event) => setDraftField(review.id, "note", event.target.value)}
                      maxLength={500}
                      rows={2}
                      disabled={isMutatingThis}
                      placeholder="اكتب ملاحظة واضحة للفريق..."
                      className="mt-2 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#10151d]/50 focus:ring-2 focus:ring-[#ffd000]/40 disabled:opacity-60"
                      data-testid={`textarea-review-note-${review.id}`}
                    />
                    <p className="mt-1 text-start font-num text-[11px] text-muted-foreground" dir="ltr">{draft.note.length}/500</p>

                    <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-border pt-4 sm:flex-row">
                      <Btn
                        variant="yellow"
                        className="min-h-12 flex-1"
                        disabled={!canApprove || reviewMutation.isPending}
                        onClick={() => submitReview(review, "approved")}
                        data-testid={`button-approve-driver-${review.id}`}
                        title={!canApprove ? "أكمل البنود العشرة وتأكد من قبول الشروط وتوفر صورة المركبة أولًا" : undefined}
                      >
                        {isMutatingThis ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {isMutatingThis ? "جارٍ حفظ القرار..." : "اعتماد الكابتن"}
                      </Btn>
                      <Btn
                        variant="danger"
                        className="min-h-12 sm:min-w-32"
                        disabled={reviewMutation.isPending}
                        onClick={() => submitReview(review, "rejected")}
                        data-testid={`button-reject-driver-${review.id}`}
                      >
                        <X className="h-4 w-4" /> رفض
                      </Btn>
                      <Btn
                        variant="ghost"
                        className="min-h-12 sm:min-w-32"
                        disabled={reviewMutation.isPending}
                        onClick={() => submitReview(review, "suspended")}
                        data-testid={`button-suspend-driver-${review.id}`}
                      >
                        <ShieldAlert className="h-4 w-4" /> إيقاف
                      </Btn>
                    </div>

                    {feedback?.id === review.id && (
                      <p role="status" aria-live="polite" className={`mt-3 rounded-xl px-3 py-2.5 text-sm font-medium ${feedback.tone === "success" ? "bg-emerald-700/10 text-emerald-800" : "bg-destructive/10 text-destructive"}`} data-testid={`feedback-review-${review.id}`}>
                        {feedback.text}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoTile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/75 bg-card px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${alert ? "text-amber-800" : ""}`} data-testid={`text-info-${label}`}>{value}</p>
    </div>
  );
}
