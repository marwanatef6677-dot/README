import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminSupportTicketsQueryKey,
  useListAdminSupportTickets,
  useUpdateAdminSupportTicket,
  type SupportTicketAdmin,
  type SupportTicketUpdate,
} from "@workspace/api-client-react";
import { AlertTriangle, Check, Clock3, LifeBuoy, LoaderCircle, RefreshCw, UserRound } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/bits";
import { errorText } from "@/lib/pablo";

type TicketDraft = { status: SupportTicketUpdate["status"]; ownerNote: string; customerReply: string };
const STATUS: Record<SupportTicketAdmin["status"], { label: string; style: string }> = {
  open: { label: "مفتوحة", style: "bg-amber-900/10 text-amber-900 border-amber-900/15" },
  in_progress: { label: "قيد المتابعة", style: "bg-[#315b68]/10 text-[#315b68] border-[#315b68]/20" },
  resolved: { label: "تم الحل", style: "bg-emerald-800/10 text-emerald-900 border-emerald-800/15" },
};
const CATEGORY: Record<SupportTicketAdmin["category"], string> = {
  ride: "رحلة", lost_item: "غرض مفقود", payment: "الدفع", account: "الحساب", safety: "السلامة", other: "أخرى",
};
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "تاريخ غير متاح" : new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export function SupportTicketsAdmin() {
  const queryClient = useQueryClient();
  const ticketsQuery = useListAdminSupportTickets({
    query: { queryKey: getListAdminSupportTicketsQueryKey(), refetchInterval: 15000 },
  });
  const updateTicket = useUpdateAdminSupportTicket();
  const [drafts, setDrafts] = useState<Record<number, TicketDraft>>({});
  const [feedback, setFeedback] = useState<Record<number, { tone: "success" | "error"; text: string }>>({});
  const tickets = ticketsQuery.data ?? [];
  const pendingCount = tickets.filter((ticket) => ticket.status !== "resolved").length;

  const draftFor = (ticket: SupportTicketAdmin): TicketDraft => drafts[ticket.id] ?? { status: ticket.status, ownerNote: ticket.ownerNote ?? "", customerReply: ticket.customerReply ?? "" };
  const setDraft = (ticket: SupportTicketAdmin, patch: Partial<TicketDraft>) => {
    setDrafts((current) => ({ ...current, [ticket.id]: { ...draftFor(ticket), ...patch } }));
    setFeedback((current) => { const next = { ...current }; delete next[ticket.id]; return next; });
  };
  const saveTicket = (ticket: SupportTicketAdmin) => {
    const draft = draftFor(ticket);
    if (draft.ownerNote.trim().length > 1000 || draft.customerReply.trim().length > 2000) {
      setFeedback((current) => ({ ...current, [ticket.id]: { tone: "error", text: "الملاحظة الداخلية لا تتعدى ١٠٠٠ حرف، والرد لا يتعدى ٢٠٠٠ حرف." } }));
      return;
    }
    updateTicket.mutate({ id: ticket.id, data: { status: draft.status, ownerNote: draft.ownerNote.trim(), customerReply: draft.customerReply.trim() } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminSupportTicketsQueryKey() });
        setDrafts((current) => { const next = { ...current }; delete next[ticket.id]; return next; });
        setFeedback((current) => ({ ...current, [ticket.id]: { tone: "success", text: "تم حفظ تحديث الطلب." } }));
      },
      onError: (error) => setFeedback((current) => ({ ...current, [ticket.id]: { tone: "error", text: errorText(error, "تعذر حفظ التحديث.") } })),
    });
  };

  return (
    <section dir="rtl" aria-labelledby="support-queue-heading" className="mb-8 overflow-hidden rounded-[1.75rem] border border-[#10151d]/10 bg-[#f6f3e9] shadow-[0_8px_30px_-20px_rgba(16,21,29,.4)]" data-testid="section-owner-support">
      <header className="flex flex-col gap-4 border-b border-[#10151d]/10 bg-[#e9e5d8] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10151d] text-[#ffd000]"><LifeBuoy className="h-5 w-5" /></span>
          <div><p className="text-xs font-bold text-[#10151d]/50">تشغيل ودعم العملاء</p><h2 id="support-queue-heading" className="mt-0.5 font-display text-xl font-black">طلبات الدعم</h2></div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="rounded-full border border-[#10151d]/10 bg-[#fffdf7] px-3 py-1.5 text-xs font-bold text-[#10151d]/70" data-testid="status-owner-support-open-count">{pendingCount} طلب غير محلول</span>
          <button type="button" onClick={() => void ticketsQuery.refetch()} data-testid="button-refresh-admin-support" aria-label="تحديث طلبات الدعم" className="grid h-9 w-9 place-items-center rounded-xl border border-[#10151d]/10 bg-[#fffdf7] text-[#10151d]/65 hover:bg-white"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        {ticketsQuery.isLoading ? <div className="space-y-3" aria-label="جارٍ تحميل طلبات الدعم" data-testid="state-admin-support-loading">
          {[0, 1].map((item) => <div key={item} className="rounded-2xl border border-[#10151d]/10 bg-[#fffdf7] p-4"><Skeleton className="h-6 w-52" /><Skeleton className="mt-3 h-14 w-full" /><Skeleton className="mt-3 h-20 w-full" /></div>)}
        </div> : ticketsQuery.isError ? <ErrorState message={errorText(ticketsQuery.error, "مش قادرين نعرض طلبات الدعم.")} onRetry={() => void ticketsQuery.refetch()} />
          : tickets.length === 0 ? <EmptyState title="مفيش طلبات دعم" body="طلبات العملاء الجديدة هتظهر هنا لمراجعتها ومتابعتها." />
            : <div className="space-y-4">
              {tickets.map((ticket) => {
                const draft = draftFor(ticket);
                const isSaving = updateTicket.isPending && updateTicket.variables?.id === ticket.id;
                const status = STATUS[ticket.status];
                const stateFeedback = feedback[ticket.id];
                return <article key={ticket.id} className="overflow-hidden rounded-2xl border border-[#10151d]/10 bg-[#fffdf7]" data-testid={`card-admin-support-ticket-${ticket.id}`}>
                  <div className="border-b border-[#10151d]/10 bg-[#10151d]/[.025] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="font-num text-[11px] text-[#10151d]/45" dir="ltr">#{ticket.id}</span>
                          <span className="rounded-full bg-[#10151d]/[.06] px-2.5 py-1 text-[10px] font-bold">{CATEGORY[ticket.category]}</span>
                          {ticket.rideId !== null && <span className="rounded-full bg-[#ffd000]/25 px-2.5 py-1 text-[10px] font-bold">رحلة #{ticket.rideId}</span>}
                        </div>
                        <h3 className="font-display text-lg font-extrabold leading-7" data-testid={`text-admin-ticket-subject-${ticket.id}`}>{ticket.subject}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.style}`} data-testid={`status-admin-support-ticket-${ticket.id}`}>
                        {ticket.status === "resolved" ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{status.label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#10151d]/60">
                      <span className="inline-flex items-center gap-1.5 font-bold"><UserRound className="h-3.5 w-3.5" />{ticket.customerName || "عميل بابلو"}</span>
                      <span dir="ltr" className="font-num">{ticket.customerPhone || "رقم غير متاح"}</span>
                      <span>{dateLabel(ticket.createdAt)}</span>
                    </div>
                  </div>
                  <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
                    <div>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-[#10151d]/80" data-testid={`text-admin-ticket-description-${ticket.id}`}>{ticket.description}</p>
                      <label htmlFor={`owner-note-${ticket.id}`} className="mt-4 block text-sm font-bold">ملاحظة المالك <span className="font-normal text-[#10151d]/45">(للمتابعة الداخلية)</span></label>
                      <textarea id={`owner-note-${ticket.id}`} value={draft.ownerNote} maxLength={1000} rows={3} onChange={(event) => setDraft(ticket, { ownerNote: event.target.value })} disabled={isSaving} data-testid={`textarea-admin-ticket-note-${ticket.id}`}
                        placeholder="سجل سياق المتابعة للفريق..."
                        className="mt-2 w-full resize-y rounded-xl border border-[#10151d]/15 bg-[#f6f3e9] px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#9a7800] focus:ring-2 focus:ring-[#ffd000]/30 disabled:opacity-60" />
                      <p className="mt-1 text-start font-num text-[10px] text-[#10151d]/40" dir="ltr">{draft.ownerNote.length}/1000</p>
                      <label htmlFor={`customer-reply-${ticket.id}`} className="mt-4 block text-sm font-bold">رد للعميل</label>
                      <textarea id={`customer-reply-${ticket.id}`} value={draft.customerReply} maxLength={2000} rows={3} onChange={(event) => setDraft(ticket, { customerReply: event.target.value })} disabled={isSaving} data-testid={`textarea-admin-ticket-reply-${ticket.id}`}
                        placeholder="اكتب ردًا واضحًا سيظهر للعميل في طلب الدعم..."
                        className="mt-2 w-full resize-y rounded-xl border border-[#315b68]/25 bg-[#315b68]/[.045] px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#315b68] focus:ring-2 focus:ring-[#315b68]/15 disabled:opacity-60" />
                      <p className="mt-1 text-start font-num text-[10px] text-[#10151d]/40" dir="ltr">{draft.customerReply.length}/2000</p>
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                      <label htmlFor={`owner-status-${ticket.id}`} className="text-sm font-bold">حالة الطلب
                        <select id={`owner-status-${ticket.id}`} value={draft.status} onChange={(event) => setDraft(ticket, { status: event.target.value as SupportTicketUpdate["status"] })} disabled={isSaving} data-testid={`select-admin-ticket-status-${ticket.id}`}
                          className="mt-1.5 block w-full rounded-xl border border-[#10151d]/15 bg-[#f6f3e9] px-3 py-3 text-sm font-medium outline-none focus:border-[#9a7800]">
                          <option value="open">مفتوحة</option><option value="in_progress">قيد المتابعة</option><option value="resolved">تم الحل</option>
                        </select>
                      </label>
                      <button type="button" onClick={() => saveTicket(ticket)} disabled={isSaving} data-testid={`button-save-admin-ticket-${ticket.id}`} className="press flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#10151d] px-4 py-2.5 text-sm font-bold text-[#ffd000] disabled:opacity-55">
                        {isSaving ? <><LoaderCircle className="h-4 w-4 animate-spin" />جارٍ الحفظ</> : <><Check className="h-4 w-4" />حفظ التحديث</>}
                      </button>
                      {stateFeedback && <p role={stateFeedback.tone === "error" ? "alert" : "status"} data-testid={`feedback-admin-ticket-${ticket.id}`} className={`rounded-lg px-3 py-2 text-xs leading-5 ${stateFeedback.tone === "success" ? "bg-emerald-900/5 text-emerald-900" : "bg-red-900/5 text-red-900"}`}>{stateFeedback.tone === "error" && <AlertTriangle className="me-1 inline h-3.5 w-3.5" />}{stateFeedback.text}</p>}
                    </div>
                  </div>
                </article>;
              })}
            </div>}
      </div>
    </section>
  );
}
