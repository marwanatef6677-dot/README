import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Gift, Loader2, Ticket, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetWeeklyWheelQueryKey, useGetWeeklyWheel, useSpinWeeklyWheel } from "@workspace/api-client-react";
import type { Profile } from "@workspace/api-client-react";
import { Btn, ErrorState, Skeleton } from "@/components/bits";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/lib/pablo";

const segments = [
  { key: "no_win", label: "حظ أوفر", odds: 52.8, color: "#46515e" },
  { key: "three", label: "خصم ٣٪", odds: 20, color: "#e9ae00" },
  { key: "four", label: "خصم ٤٪", odds: 10, color: "#278b72" },
  { key: "five_to_nine", label: "خصم ٥–٩٪", odds: 10, color: "#e76a35" },
  { key: "ten_to_nineteen", label: "خصم ١٠–١٩٪", odds: 5, color: "#cf477c" },
  { key: "twenty_to_thirty", label: "خصم ٢٠–٣٠٪", odds: 2.2, color: "#6557bd" },
] as const;

type SpinResult = {
  outcome: "win" | "no_win";
  discountPercent: number | null;
  promoCode: string | null;
  spunAt: string;
  expiresAt: string | null;
  nextSpinAt: string;
  redeemed?: boolean;
};

function segmentFor(percent: number | null) {
  if (percent == null) return segments[0];
  if (percent === 3) return segments[1];
  if (percent === 4) return segments[2];
  if (percent <= 9) return segments[3];
  if (percent <= 19) return segments[4];
  return segments[5];
}

const formatDate = (value: string) => new Date(value).toLocaleString("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function PromoCodeCard({
  promoCode,
  discountPercent,
  expiresAt,
}: {
  promoCode: string;
  discountPercent: number;
  expiresAt: string;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      toast({ title: "نسخنا كود الخصم" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "انسخ الكود يدويًا", description: "اضغط مطولًا على الكود وحدده للنسخ." });
    }
  }

  return (
    <section className="rounded-3xl border border-[#278b72]/30 bg-[#278b72]/10 p-4 sm:p-5" data-testid="panel-active-promo">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#278b72] text-white"><Ticket className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-black">مبروك، كسبت خصم {discountPercent}%</p>
          <p className="mt-1 text-sm text-foreground/75">انسخ الكود واكتبه في خانة «برومو كود» عند طلب مشوار راكب.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-[#278b72]/50 bg-background p-3">
        <code dir="ltr" className="select-all break-all font-num text-base font-black tracking-wider" data-testid="text-promo-code">{promoCode}</code>
        <button type="button" onClick={copyCode} className="press inline-flex h-10 items-center gap-2 rounded-xl bg-[#10151d] px-3 text-sm font-bold text-[#ffd000]" data-testid="button-copy-promo-code">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "اتنسخ" : "انسخ الكود"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">صالح لرحلة ركاب واحدة حتى {formatDate(expiresAt)}. لو ألغيت الرحلة قبل اكتمالها، تقدر تستخدمه مرة أخرى قبل انتهاء صلاحيته.</p>
      <Link href="/book" className="press mt-4 inline-flex items-center gap-2 rounded-full bg-[#ffd000] px-4 py-2.5 text-sm font-bold text-[#10151d]" data-testid="link-use-promo-code">
        اطلب مشوارك <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export default function WeeklyWheel({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const state = useGetWeeklyWheel({
    query: { refetchOnMount: "always", refetchInterval: 30_000 },
  });
  const spin = useSpinWeeklyWheel();
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [spinError, setSpinError] = useState("");

  const wheelBackground = `conic-gradient(from 0deg, ${segments.map((segment, index) => {
    const start = segments.slice(0, index).reduce((sum, item) => sum + item.odds, 0) * 3.6;
    const end = start + segment.odds * 3.6;
    return `${segment.color} ${start}deg ${end}deg`;
  }).join(", ")})`;

  function startSpin() {
    setSpinError("");
    setSpinResult(null);
    spin.mutate(undefined, {
      onSuccess: (result) => {
        const prize = segmentFor(result.discountPercent);
        const segmentStart = segments.slice(0, segments.findIndex((segment) => segment.key === prize.key))
          .reduce((sum, segment) => sum + segment.odds, 0) * 3.6;
        const center = segmentStart + prize.odds * 1.8;
        const remainder = ((360 - center - (rotation % 360)) % 360 + 360) % 360;
        setRotation((current) => current + 5 * 360 + remainder);
        setAnimating(true);
        window.setTimeout(() => {
          setAnimating(false);
          setSpinResult(result);
          void queryClient.invalidateQueries({ queryKey: getGetWeeklyWheelQueryKey() });
        }, 4_700);
      },
      onError: (error) => {
        setSpinError(errorText(error, "ماقدرناش نلف العجلة دلوقتي. جرّب تاني."));
        void queryClient.invalidateQueries({ queryKey: getGetWeeklyWheelQueryKey() });
        toast({ title: "العجلة ما اشتغلتش", description: errorText(error), variant: "destructive" });
      },
    });
  }

  if (profile.role !== "customer") {
    return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message="عجلة الخصم الأسبوعية مخصصة لحسابات العملاء." /></div>;
  }

  if (state.isLoading) return <div className="mx-auto max-w-3xl space-y-4 px-4 py-8"><Skeleton className="h-12 w-64" /><Skeleton className="h-80 rounded-[2rem]" /></div>;
  if (state.isError || !state.data) return <div className="mx-auto max-w-3xl px-4 py-8"><ErrorState message={errorText(state.error, "مش قادرين نجيب حالة العجلة.")} onRetry={() => state.refetch()} /></div>;

  const activePromo = state.data.activePromo;
  const showResult = spin.isPending || animating ? null : spinResult ?? (state.data.lastSpin ? {
    ...state.data.lastSpin,
    nextSpinAt: state.data.nextSpinAt ?? "",
  } : null);
  const buttonDisabled = spin.isPending || animating || !state.data.canSpin;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/book" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-wheel-back"><ArrowRight className="h-4 w-4" /> رجوع للحجز</Link>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_.9fr]">
        <section className="rounded-[2rem] border border-card-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffd000] text-[#10151d]"><Gift className="h-6 w-6" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">مكافأة بابلو الأسبوعية</p>
              <h1 className="mt-1 font-display text-2xl font-black sm:text-3xl">لف العجلة واكسب خصمًا</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">لك لفة واحدة كل ٧ أيام. لو كسبت، خُد كودًا وأدخله بنفسك عند طلب مشوار ركاب.</p>
            </div>
          </div>

          <div className="mx-auto mt-7 w-full max-w-[340px]">
            <div className="relative aspect-square">
              <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 border-x-[15px] border-t-[27px] border-x-transparent border-t-[#10151d] drop-shadow-md" />
              <motion.div
                className="absolute inset-2 rounded-full border-[9px] border-[#10151d] shadow-[0_16px_35px_-18px_rgba(16,21,29,.75)]"
                style={{ background: wheelBackground }}
                animate={{ rotate: rotation }}
                transition={{ duration: 4.6, ease: [0.12, 0.72, 0.12, 1] }}
                aria-label="عجلة خصومات بابلو"
                data-testid="wheel-spinner"
              >
                <span className="absolute inset-[31%] grid place-items-center rounded-full border-4 border-[#ffd000] bg-[#10151d] font-display text-xl font-black text-[#ffd000] shadow-lg">بابلو</span>
              </motion.div>
              <span className="absolute inset-0 rounded-full border border-[#10151d]/10" />
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-2">
            <Btn type="button" variant="yellow" onClick={startSpin} disabled={buttonDisabled} className="w-full max-w-sm" data-testid="button-spin-wheel">
              {spin.isPending || animating ? <><Loader2 className="h-5 w-5 animate-spin" /> العجلة بتلف...</> : <><Trophy className="h-5 w-5" /> لف العجلة</>}
            </Btn>
            {state.data.canSpin ? (
              <p className="text-center text-xs text-muted-foreground">النتيجة تُحدد مرة واحدة من الخادم، والكود لا يعمل إلا على حسابك.</p>
            ) : state.data.nextSpinAt ? (
              <p className="text-center text-xs text-muted-foreground" data-testid="text-next-spin">تقدر تلف تاني بعد {formatDate(state.data.nextSpinAt)}.</p>
            ) : null}
          </div>
          {spinError && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-wheel-error">{spinError}</p>}
        </section>

        <aside className="space-y-4">
          {activePromo && (
            <PromoCodeCard
              promoCode={activePromo.promoCode}
              discountPercent={activePromo.discountPercent}
              expiresAt={activePromo.expiresAt}
            />
          )}
          {!activePromo && showResult && (
            <section className="rounded-3xl border border-card-border bg-card p-5" aria-live="polite" data-testid="panel-wheel-result">
              <p className="text-xs font-bold text-muted-foreground">آخر نتيجة</p>
              {showResult.outcome === "win" && showResult.discountPercent != null ? (
                <p className="mt-2 font-display text-xl font-black">خصم {showResult.discountPercent}%</p>
              ) : (
                <p className="mt-2 font-display text-xl font-black">حظ أوفر المرة الجاية</p>
              )}
              {showResult.redeemed && <p className="mt-2 text-sm text-muted-foreground">تم استخدام كود المكافأة في رحلة مكتملة.</p>}
              {!showResult.redeemed && showResult.expiresAt && new Date(showResult.expiresAt) <= new Date() && <p className="mt-2 text-sm text-muted-foreground">انتهت صلاحية الكود قبل استخدامه.</p>}
              {spinResult?.outcome === "win" && spinResult.promoCode && spinResult.expiresAt && (
                <div className="mt-4">
                  <PromoCodeCard promoCode={spinResult.promoCode} discountPercent={spinResult.discountPercent!} expiresAt={spinResult.expiresAt} />
                </div>
              )}
            </section>
          )}
          <section className="rounded-3xl border border-card-border bg-card p-5">
            <h2 className="font-display text-lg font-black">فرص الجوائز</h2>
            <div className="mt-3 space-y-2">
              {segments.map((segment) => (
                <div key={segment.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: segment.color }} />{segment.label}</span>
                  <strong className="font-num">{segment.odds.toLocaleString("ar-EG", { maximumFractionDigits: 1 })}%</strong>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">فرصة كل خصم داخل مجموعة ٥–٩٪ هي ٢٪، وداخل ١٠–١٩٪ هي ٠٫٥٪، وداخل ٢٠–٣٠٪ هي ٠٫٢٪. الخصم لمشوار ركاب واحد فقط، وبابلو تتحمل قيمته.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
