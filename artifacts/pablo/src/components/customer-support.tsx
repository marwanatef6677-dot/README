import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListRidesQueryKey,
  getListSupportTicketsQueryKey,
  useCreateSupportTicket,
  useListRides,
  useListSupportTickets,
  type SupportTicketInput,
} from "@workspace/api-client-react";
import { LifeBuoy, X, Send, ArrowRight, MessageCircle, Ticket, ShieldCheck, LoaderCircle, RefreshCw, ChevronDown, Phone } from "lucide-react";
import { errorText } from "@/lib/pablo";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Category = SupportTicketInput["category"];

const FAQS = [
  {
    id: "fare",
    title: "إزاي الأجرة بتتحسب؟",
    answer: "أسعار التجربة: مشوار العربية ٢٠ جنيه بداية + ١٠ جنيه لكل كم + جنيه لكل دقيقة (حد أدنى ٤٠). مشوار الراكب بالموتوسيكل ١٥ جنيه بداية + ٨ جنيه لكل كم + جنيه لكل دقيقة (حد أدنى ٣٠). التوصيل بالموتوسيكل ٣٠ جنيه بداية + ٨ جنيه لكل كم. السعر النهائي التقديري بيظهر قبل إرسال الطلب.",
  },
  {
    id: "cash",
    title: "إيه طرق الدفع المتاحة؟",
    answer: "الدفع كاش للكابتن هو المتاح في التجربة الحالية. قبل ما تبدأ، اتفقوا على تفاصيل المشوار الظاهرة في التطبيق.",
  },
  {
    id: "captain",
    title: "أتواصل مع الكابتن إزاي؟",
    answer: "بعد ما الكابتن يقبل الطلب، هتظهر لك وسيلة التواصل داخل تفاصيل الرحلة. استخدمها للتنسيق بخصوص نقطة الالتقاء فقط.",
  },
  {
    id: "location",
    title: "أتابع مكان الكابتن منين؟",
    answer: "في الرحلة النشطة، افتح تفاصيل الرحلة. هتظهر حركة الكابتن على الخريطة لما تكون مشاركة الموقع متاحة.",
  },
] as const;

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "ride", label: "مشكلة في رحلة" },
  { value: "lost_item", label: "غرض مفقود" },
  { value: "payment", label: "الدفع أو الأجرة" },
  { value: "account", label: "الحساب" },
  { value: "safety", label: "السلامة" },
  { value: "other", label: "موضوع آخر" },
];

const STATUS_LABEL: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المتابعة", resolved: "تم الحل" };
const SUPPORT_PHONE = "+201210108856";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "تاريخ غير متاح" : new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

export function CustomerSupport({ placement = "header" }: { placement?: "header" | "mobile-nav" }) {
  const inMobileNav = placement === "mobile-nav";
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"help" | "chat" | "ticket">("help");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [ticketFeedback, setTicketFeedback] = useState("");
  const [ticketError, setTicketError] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [rideId, setRideId] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const ticketsQuery = useListSupportTickets({ query: { queryKey: getListSupportTicketsQueryKey(), enabled: isOpen, refetchInterval: isOpen ? 15000 : false, refetchOnWindowFocus: true } });
  const ridesQuery = useListRides({ query: { queryKey: getListRidesQueryKey(), enabled: isOpen && view === "ticket" } });
  const createTicket = useCreateSupportTicket();

  useEffect(() => {
    if (isOpen && view === "chat") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen, view]);

  const close = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setChatBusy(false);
    setMessages((current) => current.at(-1)?.role === "assistant" && !current.at(-1)?.content ? current.slice(0, -1) : current);
    setIsOpen(false);
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  const openPanel = () => {
    setIsOpen(true);
    setView("help");
    setTicketFeedback("");
    setTicketError("");
  };

  const answerFaq = (answer: string) => {
    setMessages((current) => [...current, { role: "assistant", content: answer }]);
    setView("chat");
  };

  const sendMessage = async (contentInput: string, previousMessages: ChatMessage[] = messages) => {
    const content = contentInput.trim();
    if (!content || chatBusy) return;
    const updatedMessages: ChatMessage[] = [...previousMessages, { role: "user", content }];
    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setDraft("");
    setChatError("");
    setChatBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/openai/support-chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: updatedMessages.slice(-12) }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("مش قادرين نوصل للمساعد دلوقتي. جرّب تاني أو ابعت طلب دعم.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = false;
      const consumeEvent = (raw: string) => {
        const data = raw.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data) return;
        let item: { content?: string; done?: boolean; error?: string };
        try { item = JSON.parse(data) as typeof item; } catch { return; }
        if (item.error) throw new Error(item.error);
        if (item.content) {
          setMessages((current) => current.map((message, index) =>
            index === current.length - 1 && message.role === "assistant"
              ? { ...message, content: message.content + item.content }
              : message));
        }
        if (item.done) complete = true;
      };
      while (!complete) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const item of events) consumeEvent(item);
        if (done) {
          if (buffer.trim()) consumeEvent(buffer);
          break;
        }
      }
      if (!complete) throw new Error("انقطع الاتصال قبل اكتمال الرد. تقدر تحاول تاني أو تبعت طلب دعم.");
    } catch (error) {
      if (!controller.signal.aborted) {
        setChatError(error instanceof Error ? error.message : "حصلت مشكلة في الاتصال.");
        setMessages((current) => current.at(-1)?.role === "assistant" && !current.at(-1)?.content ? current.slice(0, -1) : current);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setChatBusy(false);
    }
  };

  const submitTicket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanDescription = description.trim();
    if (cleanSubject.length < 3 || cleanDescription.length < 10) {
      setTicketError("اكتب عنوانًا من ٣ أحرف على الأقل وتفاصيل من ١٠ أحرف.");
      return;
    }
    const data: SupportTicketInput = { category, subject: cleanSubject, description: cleanDescription, rideId: rideId ? Number(rideId) : null };
    setTicketError("");
    setTicketFeedback("");
    createTicket.mutate({ data }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListSupportTicketsQueryKey() });
        setTicketFeedback("وصلنا طلبك واتسجل هنا. شكرًا إنك وضحت التفاصيل.");
        setSubject("");
        setDescription("");
        setRideId("");
        setView("help");
      },
      onError: (error) => setTicketError(errorText(error, "ماقدرناش نسجل الطلب. راجع الاتصال وحاول تاني.")),
    });
  };

  const tickets = ticketsQuery.data ?? [];
  const rides = ridesQuery.data ?? [];

  return (
    <>
      <button type="button" onClick={openPanel} data-testid={inMobileNav ? "button-open-customer-support-mobile" : "button-open-customer-support"}
        aria-label={inMobileNav ? "فتح خدمة العملاء" : "مساعدة ودعم"} aria-haspopup="dialog" aria-expanded={isOpen}
        className={inMobileNav
          ? "press flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-[1.2rem] text-[11px] font-semibold text-[#f6f1e4]/65 transition-colors hover:bg-white/10 hover:text-[#f6f1e4]"
          : "press hidden items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-foreground/20 hover:bg-muted md:inline-flex"}>
        <LifeBuoy className={inMobileNav ? "h-5 w-5 text-[#ffd000]" : "h-4 w-4 text-[#9a6b00]"} />
        <span className={inMobileNav ? "inline" : "hidden sm:inline"}>{inMobileNav ? "الدعم" : "مساعدة"}</span>
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#10151d]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="support-heading"
            className="support-panel-enter flex h-[min(760px,94dvh)] w-full max-w-[510px] flex-col overflow-hidden rounded-t-[2rem] border border-[#10151d]/10 bg-[#f6f3e9] shadow-[0_28px_90px_-28px_rgba(16,21,29,.5)] sm:h-[min(760px,90dvh)] sm:rounded-[2rem]"
            data-testid="panel-customer-support">
            <header className="relative overflow-hidden bg-[#10151d] px-5 pb-5 pt-5 text-[#f6f1e4]">
              <div className="absolute -left-9 -top-14 h-40 w-40 rounded-full border-[18px] border-[#ffd000]/10" aria-hidden />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ffd000] text-[#10151d]"><LifeBuoy className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs font-semibold text-[#ffd000]">بابلو · معاك</p>
                    <h2 id="support-heading" className="mt-1 font-display text-xl font-black">مركز المساعدة</h2>
                  </div>
                </div>
                <button type="button" onClick={close} aria-label="إغلاق" data-testid="button-close-customer-support"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              <p className="relative mt-4 max-w-sm text-sm leading-6 text-[#f6f1e4]/70">اسألنا، أو اختار إجابة سريعة. ولو محتاج متابعة، ابعتلنا طلب دعم يتسجل عندك.</p>
            </header>

            <div className="flex items-center gap-2 border-b border-[#10151d]/10 bg-[#f6f3e9] px-4 py-3">
              <button type="button" onClick={() => setView("help")} data-testid="button-support-tab-help" className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${view === "help" ? "bg-[#10151d] text-[#ffd000]" : "text-[#10151d]/65 hover:bg-black/5"}`}><LifeBuoy className="me-1.5 inline h-4 w-4" />المساعدة</button>
              <button type="button" onClick={() => setView("chat")} data-testid="button-support-tab-chat" className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${view === "chat" ? "bg-[#10151d] text-[#ffd000]" : "text-[#10151d]/65 hover:bg-black/5"}`}><MessageCircle className="me-1.5 inline h-4 w-4" />اسأل بابلو</button>
              <button type="button" onClick={() => setView("ticket")} data-testid="button-support-tab-ticket" className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${view === "ticket" ? "bg-[#10151d] text-[#ffd000]" : "text-[#10151d]/65 hover:bg-black/5"}`}><Ticket className="me-1.5 inline h-4 w-4" />طلب دعم</button>
            </div>

            <div className="support-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {view === "help" && (
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-base font-extrabold">إجابات سريعة</h3><span className="text-[11px] font-semibold text-[#10151d]/45">من غير انتظار</span></div>
                    <div className="space-y-2">
                      {FAQS.map((faq) => <button type="button" key={faq.id} onClick={() => answerFaq(faq.answer)} data-testid={`button-support-faq-${faq.id}`}
                        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[#10151d]/10 bg-[#fffdf7] px-4 py-3 text-start text-sm font-bold text-[#10151d] transition-colors hover:border-[#c49a12]/50 hover:bg-[#fff9dc]">
                        <span>{faq.title}</span><ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-[#8c6a00] transition-transform group-hover:-translate-x-1" />
                      </button>)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#10151d]/10 bg-[#e9e5d8] p-4">
                    <div className="flex gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#416b5b]" />
                      <p className="text-xs leading-6 text-[#10151d]/75">الأسئلة المفتوحة تُرسل لخدمة الذكاء الاصطناعي لإعداد الرد. ما تبعتش كلمات مرور أو أكواد تحقق أو بيانات دفع. المساعد للإرشاد فقط؛ ما يقدرش يغيّر الرحلات أو يوعد باسترداد فلوس. لو في مشكلة مستمرة، سجّل طلب دعم.</p>
                    </div>
                  </div>
                  <section className="rounded-2xl border border-[#10151d]/10 bg-[#fffdf7] p-4" data-testid="section-support-contact">
                    <p className="text-sm font-bold">محتاج تتكلم مع حد؟</p>
                    <p className="mt-1 text-xs leading-5 text-[#10151d]/60">فريق بابلو على الخط من خلال الاتصال أو واتساب.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a href={`tel:${SUPPORT_PHONE}`} data-testid="link-support-call" className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#10151d] px-3 text-xs font-bold text-[#ffd000]"><Phone className="h-4 w-4" />اتصال</a>
                      <a href={`https://wa.me/201210108856`} target="_blank" rel="noreferrer" data-testid="link-support-whatsapp" className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#10151d]/15 px-3 text-xs font-bold text-[#10151d]"><MessageCircle className="h-4 w-4" />واتساب</a>
                    </div>
                    <p className="mt-2 text-center font-num text-[11px] text-[#10151d]/50" dir="ltr">{SUPPORT_PHONE}</p>
                  </section>
                  {ticketFeedback && <p role="status" data-testid="status-support-ticket-success" className="rounded-xl border border-emerald-800/15 bg-emerald-800/5 px-3 py-2.5 text-sm font-semibold text-emerald-900">{ticketFeedback}</p>}
                  <div>
                    <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-base font-extrabold">طلباتك السابقة</h3><button type="button" onClick={() => void ticketsQuery.refetch()} data-testid="button-refresh-support-tickets" aria-label="تحديث الطلبات" className="rounded-lg p-2 text-[#10151d]/55 hover:bg-black/5"><RefreshCw className="h-4 w-4" /></button></div>
                    {ticketsQuery.isLoading ? <div className="space-y-2" data-testid="state-support-tickets-loading"><div className="skeleton h-16 rounded-xl" /><div className="skeleton h-16 rounded-xl" /></div>
                      : ticketsQuery.isError ? <div className="rounded-xl border border-red-800/15 bg-red-900/5 p-3 text-sm text-red-900"><p>{errorText(ticketsQuery.error, "مش قادرين نعرض الطلبات.")}</p><button type="button" onClick={() => void ticketsQuery.refetch()} data-testid="button-retry-support-tickets" className="mt-2 font-bold underline">حاول تاني</button></div>
                      : tickets.length === 0 ? <div className="rounded-2xl border border-dashed border-[#10151d]/20 px-4 py-5 text-center"><Ticket className="mx-auto h-5 w-5 text-[#10151d]/35" /><p className="mt-2 text-sm font-bold">لسه مفيش طلبات دعم</p><p className="mt-1 text-xs text-[#10151d]/55">أي طلب تبعته هتقدر تتابعه من هنا.</p></div>
                      : <div className="space-y-2">{tickets.slice(0, 4).map((ticket) => <article key={ticket.id} className="rounded-xl border border-[#10151d]/10 bg-[#fffdf7] px-3 py-3" data-testid={`card-customer-ticket-${ticket.id}`}>
                        <div className="flex items-start justify-between gap-2"><h4 className="text-sm font-bold leading-5">{ticket.subject}</h4><span className="shrink-0 rounded-full bg-[#10151d]/[.06] px-2 py-1 text-[10px] font-bold" data-testid={`status-customer-ticket-${ticket.id}`}>{STATUS_LABEL[ticket.status] ?? ticket.status}</span></div>
                        <p className="mt-1 text-[11px] text-[#10151d]/50">{dateLabel(ticket.createdAt)}{ticket.rideId ? ` · رحلة #${ticket.rideId}` : ""}</p>
                        {ticket.customerReply && <div className="mt-3 rounded-xl border-r-2 border-[#315b68] bg-[#315b68]/[.07] px-3 py-2.5" data-testid={`text-customer-ticket-reply-${ticket.id}`}><p className="text-[10px] font-bold text-[#315b68]">رد فريق بابلو</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#10151d]/80">{ticket.customerReply}</p></div>}
                      </article>)}</div>}
                  </div>
                </div>
              )}

              {view === "chat" && (
                <div className="flex min-h-full flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div><h3 className="font-display text-base font-extrabold">اسأل بلغتك</h3><p className="mt-1 text-xs text-[#10151d]/55">للسؤال الحر استخدم المساعد، وللإجابة السريعة اختار موضوعًا معروفًا.</p></div>
                    <button type="button" onClick={() => setView("help")} data-testid="button-chat-faq-back" aria-label="العودة للإجابات" className="rounded-lg p-2 text-[#10151d]/55 hover:bg-black/5"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                  <div ref={scrollRef} className="support-scroll min-h-[220px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[#10151d]/10 bg-[#ebe7dc] p-3" data-testid="region-support-chat">
                    {messages.length === 0 ? <div className="grid min-h-[200px] place-items-center px-6 text-center"><div><MessageCircle className="mx-auto h-7 w-7 text-[#8c6a00]" /><p className="mt-3 text-sm font-bold">أهلًا بيك، إيه اللي محتاج تعرفه؟</p><p className="mt-1 text-xs leading-5 text-[#10151d]/55">لو الموضوع عن الأجرة أو الدفع، اختار الإجابة السريعة من المساعدة.</p></div></div>
                      : messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`} data-testid={`message-support-${index}`}>
                        <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-[#10151d] text-[#f6f1e4]" : "rounded-bl-md border border-[#10151d]/10 bg-[#fffdf7] text-[#10151d]"}`}>
                          {message.content || (chatBusy && index === messages.length - 1 ? <span className="inline-flex items-center gap-2 text-[#10151d]/50"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8c6a00]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8c6a00] [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8c6a00] [animation-delay:300ms]" />بابلو بيكتب</span> : "")}
                        </p>
                      </div>)}
                  </div>
                  {chatError && <div role="alert" data-testid="status-support-chat-error" className="mt-3 rounded-xl border border-red-800/15 bg-red-900/5 px-3 py-2.5 text-xs leading-5 text-red-900">
                    <p>{chatError}</p>
                    <div className="mt-1.5 flex gap-3">
                      <button type="button" onClick={() => {
                        const lastUserIndex = messages.reduce((lastIndex, message, index) => message.role === "user" ? index : lastIndex, -1);
                        if (lastUserIndex >= 0) void sendMessage(messages[lastUserIndex].content, messages.slice(0, lastUserIndex));
                      }} data-testid="button-retry-support-chat" className="font-bold underline">إعادة إرسال السؤال</button>
                      <button type="button" onClick={() => { setChatError(""); setView("ticket"); }} data-testid="button-chat-handoff-error" className="font-bold underline">ابعت طلب دعم</button>
                    </div>
                  </div>}
                  <form onSubmit={(event) => { event.preventDefault(); void sendMessage(draft); }} className="mt-3 flex gap-2">
                    <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} disabled={chatBusy} placeholder="اكتب سؤالك هنا..." aria-label="رسالتك" data-testid="input-support-chat"
                      className="min-w-0 flex-1 rounded-xl border border-[#10151d]/15 bg-[#fffdf7] px-4 py-3 text-sm outline-none placeholder:text-[#10151d]/40 focus:border-[#9a7800] focus:ring-2 focus:ring-[#ffd000]/35 disabled:opacity-60" />
                    <button type="submit" disabled={!draft.trim() || chatBusy} aria-label="إرسال السؤال" data-testid="button-send-support-chat" className="press grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#ffd000] text-[#10151d] disabled:cursor-not-allowed disabled:opacity-45"><Send className="h-4 w-4" /></button>
                  </form>
                  <button type="button" onClick={() => setView("ticket")} data-testid="button-chat-handoff" className="mt-2 self-center text-xs font-bold text-[#6f5700] underline decoration-[#c49a12]/50 underline-offset-4">لسه محتاج مساعدة؟ سجّل طلب دعم</button>
                </div>
              )}

              {view === "ticket" && (
                <div>
                  <div className="mb-4"><h3 className="font-display text-lg font-black">خلّينا نتابع الموضوع</h3><p className="mt-1 text-sm leading-6 text-[#10151d]/60">اكتب التفاصيل المهمة عشان تفضل محفوظة في طلبك.</p></div>
                  <form onSubmit={submitTicket} className="space-y-3">
                    <label className="block text-sm font-bold" htmlFor="support-category">نوع الموضوع
                      <select id="support-category" value={category} onChange={(event) => setCategory(event.target.value as Category)} data-testid="select-support-category" className="mt-1.5 block w-full rounded-xl border border-[#10151d]/15 bg-[#fffdf7] px-3 py-3 text-sm font-medium outline-none focus:border-[#9a7800]">
                        {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-bold" htmlFor="support-subject">عنوان الطلب
                      <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} minLength={3} required data-testid="input-support-subject" placeholder="مثال: نسيت شنطتي في الرحلة"
                        className="mt-1.5 block w-full rounded-xl border border-[#10151d]/15 bg-[#fffdf7] px-3 py-3 text-sm font-normal outline-none focus:border-[#9a7800]" />
                    </label>
                    <label className="block text-sm font-bold" htmlFor="support-description">التفاصيل
                      <textarea id="support-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} minLength={10} rows={4} required data-testid="textarea-support-description" placeholder="إيه اللي حصل؟ اكتب أي تفاصيل تساعدنا نفهم الموضوع."
                        className="mt-1.5 block w-full resize-y rounded-xl border border-[#10151d]/15 bg-[#fffdf7] px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-[#9a7800]" />
                      <span className="mt-1 block text-end text-[10px] font-normal text-[#10151d]/45" dir="ltr">{description.length}/2000</span>
                    </label>
                    <label className="block text-sm font-bold" htmlFor="support-ride">اربط برحلة <span className="font-normal text-[#10151d]/45">(اختياري)</span>
                      <select id="support-ride" value={rideId} onChange={(event) => setRideId(event.target.value)} data-testid="select-support-ride" className="mt-1.5 block w-full rounded-xl border border-[#10151d]/15 bg-[#fffdf7] px-3 py-3 text-sm font-medium outline-none focus:border-[#9a7800]">
                        <option value="">من غير رحلة</option>
                        {rides.map((ride) => <option key={ride.id} value={ride.id}>#{ride.id} · {ride.pickup} ← {ride.destination}</option>)}
                      </select>
                      {ridesQuery.isError && <span className="mt-1 block text-xs font-normal text-[#10151d]/55">تعذر تحميل الرحلات؛ تقدر تكمل الطلب من غير ربط.</span>}
                    </label>
                    {ticketError && <p role="alert" data-testid="status-support-ticket-error" className="rounded-xl border border-red-800/15 bg-red-900/5 px-3 py-2.5 text-sm text-red-900">{ticketError}</p>}
                    <button type="submit" disabled={createTicket.isPending} data-testid="button-submit-support-ticket" className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10151d] px-4 py-3 text-sm font-bold text-[#ffd000] shadow-[0_4px_0_#c49a12] disabled:opacity-60">
                      {createTicket.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" />جارٍ تسجيل الطلب</> : <><Ticket className="h-4 w-4" />تسجيل طلب الدعم</>}
                    </button>
                  </form>
                  <p className="mt-4 text-center text-[11px] leading-5 text-[#10151d]/50">ما تبعتش كلمات مرور أو أكواد تحقق أو دفع. طلب الدعم ما يغيّرش الرحلة ولا يضمن استرداد فلوس.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
