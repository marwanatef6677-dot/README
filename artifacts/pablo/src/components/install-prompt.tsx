import { useEffect, useState } from "react";
import { Download, MoreVertical, Share } from "lucide-react";
import { useInstall } from "@/hooks/use-install";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InstallPrompt() {
  const { canPrompt, standalone, isIOS, isMobile, install } = useInstall();
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isMobile || standalone) return;
    // A short delay lets the app's opening animation finish; this repeats on
    // each browser visit until the app is installed or opened standalone.
    const timer = window.setTimeout(() => setOpen(true), 1_750);
    return () => window.clearTimeout(timer);
  }, [isMobile, standalone]);

  async function installNow() {
    setInstalling(true);
    setError("");
    try {
      const result = await install();
      if (result === "unavailable") {
        setError("زر التثبيت غير متاح حاليًا. استخدم خطوات المتصفح الموجودة هنا.");
        return;
      }
      setOpen(false);
    } catch {
      setError("ماقدرناش نفتح التثبيت دلوقتي. جرّب من قائمة المتصفح.");
    } finally {
      setInstalling(false);
    }
  }

  if (!isMobile || standalone) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-md rounded-[1.75rem] border-[#10151d]/10 bg-[#fbf8f0] p-6 text-[#10151d]">
        <DialogHeader className="text-right sm:text-right">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#10151d] text-[#ffd000]">
            <Download className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-2xl font-black">ثبّت بابلو على موبايلك</DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed text-[#10151d]/65">
            افتحه من الشاشة الرئيسية بسرعة، من غير ما تدور عليه كل مرة.
          </DialogDescription>
        </DialogHeader>

        {isIOS ? (
          <div className="rounded-2xl bg-[#10151d]/5 p-4 text-sm leading-relaxed" data-testid="text-install-ios-help">
            <p className="flex items-start gap-2 font-semibold">
              <Share className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              على iPhone، افتح بابلو في Safari، واضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية».
            </p>
          </div>
        ) : canPrompt ? (
          <p className="text-sm leading-relaxed text-[#10151d]/70" data-testid="text-install-android-help">
            اضغط تثبيت، وبعدها أكّد الإضافة من نافذة المتصفح.
          </p>
        ) : (
          <div className="rounded-2xl bg-[#10151d]/5 p-4 text-sm leading-relaxed" data-testid="text-install-android-help">
            <p className="flex items-start gap-2">
              <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              من قائمة المتصفح (⋮) اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».
            </p>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-700" data-testid="text-install-error">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          {!isIOS && canPrompt && (
            <button
              type="button"
              onClick={installNow}
              disabled={installing}
              className="press min-h-11 flex-1 rounded-xl bg-[#ffd000] px-4 font-display font-bold text-[#10151d] disabled:opacity-60"
              data-testid="button-install-prompt"
            >
              {installing ? "جاري فتح التثبيت…" : "ثبّت التطبيق"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="press min-h-11 flex-1 rounded-xl border border-[#10151d]/15 px-4 font-semibold text-[#10151d]"
            data-testid="button-dismiss-install-prompt"
          >
            {isIOS ? "تمام" : "مش دلوقتي"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
