import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import {
  getListRideMessagesQueryKey,
  useListRideMessages,
  useSendRideMessage,
} from "@workspace/api-client-react";
import type { Profile } from "@workspace/api-client-react";
import { errorText } from "@/lib/pablo";

const ACTIVE_CHAT_STATES = ["accepted", "arrived", "in_progress"];

export function RideChat({ rideId, profile, rideStatus }: { rideId: number; profile: Profile; rideStatus: string }) {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const active = ACTIVE_CHAT_STATES.includes(rideStatus);
  const messagesQuery = useListRideMessages(rideId, {
    query: {
      queryKey: getListRideMessagesQueryKey(rideId),
      refetchInterval: active ? 3000 : false,
      retry: 1,
    },
  });
  const send = useSendRideMessage();
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || send.isPending || !active) return;
    send.mutate(
      { id: rideId, data: { message: text } },
      {
        onSuccess: () => {
          setMessage("");
          void queryClient.invalidateQueries({ queryKey: getListRideMessagesQueryKey(rideId) });
        },
      },
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-card-border bg-card" data-testid="panel-ride-chat">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#10151d] text-[#ffd000]"><MessageCircle className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display font-bold">دردشة الرحلة</h2>
          <p className="text-xs text-muted-foreground">بين العميل والكابتن المعيّن فقط</p>
        </div>
      </header>

      <div ref={listRef} className="max-h-72 min-h-32 space-y-2 overflow-y-auto bg-muted/25 p-3" aria-live="polite">
        {messagesQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">بنحمّل المحادثة...</p>
        ) : messagesQuery.isError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">{errorText(messagesQuery.error, "مش قادرين نجيب الرسائل.")}</p>
            <button type="button" className="mt-2 text-xs font-bold underline" onClick={() => void messagesQuery.refetch()}>حاول تاني</button>
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">ابدأوا المحادثة هنا للتنسيق على نقطة الركوب.</p>
        ) : messages.map((item) => {
          const mine = item.senderId === profile.id;
          const time = new Date(item.createdAt);
          return (
            <article key={item.id} className={`max-w-[88%] rounded-2xl px-3 py-2 ${mine ? "mr-auto bg-[#10151d] text-[#f6f1e4]" : "ml-auto bg-[#ffd000]/45 text-[#10151d]"}`} data-testid={`chat-message-${item.id}`}>
              <p className="text-[10px] font-bold opacity-70">{mine ? "أنت" : item.senderName}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.message}</p>
              <time className="mt-1 block text-start text-[10px] opacity-65" dir="ltr">
                {Number.isNaN(time.getTime()) ? "" : new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" }).format(time)}
              </time>
            </article>
          );
        })}
        <div aria-hidden="true" />
      </div>

      {active ? (
        <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            aria-label="اكتب رسالة للكابتن أو العميل"
            placeholder="اكتب رسالة..."
            className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#ffd000]/50"
            data-testid="input-chat-message"
          />
          <button type="submit" disabled={!message.trim() || send.isPending} aria-label="إرسال الرسالة" data-testid="button-send-message"
            className="press grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#ffd000] text-[#10151d] disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">المحادثة للقراءة فقط بعد انتهاء الرحلة أو إلغائها.</p>
      )}
      {send.isError && <p className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive" role="alert">{errorText(send.error, "لم تُرسل الرسالة.")}</p>}
    </section>
  );
}
