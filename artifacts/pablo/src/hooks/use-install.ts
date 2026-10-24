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
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    f();
    return () => { subs.delete(f); };
  }, []);
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const isIOS = typeof navigator !== "undefined" && (
    /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  async function install() {
    const promptEvent = stored;
    if (!promptEvent) return "unavailable" as const;
    await promptEvent.prompt();
    const r = await promptEvent.userChoice;
    if (stored === promptEvent) stored = null;
    subs.forEach((f) => f());
    return r.outcome;
  }
  return { canPrompt: !!stored, standalone, isIOS, isMobile, install };
}
