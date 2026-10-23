import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let stored: BIPEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); stored = e as BIPEvent; subs.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { stored = null; subs.forEach((f) => f()); });
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function install() {
    if (!stored) return "unavailable" as const;
    await stored.prompt();
    const r = await stored.userChoice;
    stored = null; subs.forEach((f) => f());
    return r.outcome;
  }
  return { canPrompt: !!stored, standalone, isIOS, install };
}
