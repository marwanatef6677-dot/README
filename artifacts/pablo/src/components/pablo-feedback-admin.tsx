import { getGetPabloFeedbackSummaryQueryKey, useGetPabloFeedbackSummary } from "@workspace/api-client-react";
import { Star } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/bits";
import { errorText } from "@/lib/pablo";

function formatDate(value: string | null) {
  if (!value) return "التاريخ غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "التاريخ غير متاح";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PabloFeedbackAdmin() {
  const query = useGetPabloFeedbackSummary({
    query: { queryKey: getGetPabloFeedbackSummaryQueryKey(), refetchInterval: 30000 },
  });

  return (
    <section className="mb-7 rounded-3xl border border-card-border bg-card p-5 sm:p-6" aria-labelledby="pablo-feedback-heading" data-testid="panel-pablo-feedback-admin">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground">صوت العملاء</p>
          <h2 id="pablo-feedback-heading" className="mt-1 font-display text-2xl font-black">تقييم بابلو</h2>
        </div>
        {query.data && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#ffd000]/15 px-4 py-3" data-testid="summary-pablo-rating">
            <Star className="h-6 w-6 fill-[#ffd000] text-[#10151d]" />
            <div>
              <p className="font-num text-xl font-black">{query.data.averageRating?.toFixed(1) ?? "—"} / 5</p>
              <p className="text-xs text-muted-foreground">{query.data.totalRatings.toLocaleString("ar-EG")} تقييم</p>
            </div>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <div className="mt-5 space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : query.isError ? (
        <div className="mt-5"><ErrorState message={errorText(query.error, "تعذر تحميل تقييمات بابلو.")} onRetry={() => void query.refetch()} /></div>
      ) : query.data?.recent.length ? (
        <div className="mt-5 space-y-3">
          {query.data.recent.map((entry) => (
            <article key={entry.rideId} className="rounded-2xl border border-border bg-background p-4" data-testid={`card-pablo-feedback-${entry.rideId}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{entry.customerName} <span className="text-xs font-normal text-muted-foreground">· رحلة #{entry.rideId}</span></p>
                <span className="inline-flex" dir="ltr" aria-label={`تقييم ${entry.rating} من 5`}>
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= entry.rating ? "fill-[#ffd000] text-[#10151d]" : "text-foreground/20"}`} />)}
                </span>
              </div>
              {entry.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{entry.comment}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(entry.submittedAt)}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">لسه مفيش تقييمات لبابلو.</p>
      )}
    </section>
  );
}
