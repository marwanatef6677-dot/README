import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CarFront, Route } from "lucide-react";

export function AppStartupSplash() {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 1_550);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <AnimatePresence>
      {visible && !reducedMotion && (
        <motion.div
          role="status"
          aria-label="جارٍ فتح بابلو"
          aria-live="polite"
          className="fixed inset-0 z-[100] grid place-items-center bg-[#10151d] px-6 text-[#f6f1e4]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          data-testid="panel-app-startup"
        >
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] bg-[#ffd000] text-[#10151d] shadow-[0_8px_0_rgba(255,208,0,.18)]">
              <Route className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="mt-5 font-display text-4xl font-black">بابلو</p>
            <p className="mt-2 text-sm text-[#f6f1e4]/65">مشوارك على مزاجك.</p>

            <div className="relative mt-9 h-24 overflow-hidden rounded-3xl border border-[#f6f1e4]/10 bg-[#f6f1e4]/[0.04]" aria-hidden="true">
              <div className="absolute inset-x-5 top-1/2 border-t border-dashed border-[#f6f1e4]/25" />
              <motion.span
                className="absolute top-[23%] grid h-10 w-11 place-items-center rounded-xl bg-[#ffd000] text-[#10151d] shadow-lg"
                initial={{ left: "-14%" }}
                animate={{ left: "110%" }}
                transition={{ duration: 1.15, ease: "linear" }}
              >
                <CarFront className="h-6 w-6" />
              </motion.span>
              <motion.span
                className="absolute top-[58%] grid h-9 w-10 place-items-center rounded-xl bg-[#f6f1e4] text-[#10151d] shadow-lg"
                initial={{ left: "-14%" }}
                animate={{ left: "110%" }}
                transition={{ duration: 1.15, delay: 0.18, ease: "linear" }}
              >
                <CarFront className="h-5 w-5" />
              </motion.span>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="mt-6 rounded-full px-4 py-2 text-xs font-semibold text-[#f6f1e4]/60 underline underline-offset-4 hover:text-[#ffd000]"
              data-testid="button-skip-startup"
            >
              تخطّي
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
