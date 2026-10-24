import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, MapPin, MessageCircle, Navigation, Phone, Route, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type WelcomeProps = {
  onContinue: () => void;
};

const routePoints = [
  { x: 72, y: 68 },
  { x: 128, y: 104 },
  { x: 182, y: 84 },
  { x: 239, y: 136 },
  { x: 302, y: 114 },
  { x: 366, y: 164 },
];

export default function Welcome({ onContinue }: WelcomeProps) {
  const reduceMotion = useReducedMotion();
  const appear = (delay: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.65, delay },
  });

  return (
    <div dir="rtl" className="welcome-page relative isolate overflow-hidden">
      <div aria-hidden="true" className="welcome-grain" />
      <div aria-hidden="true" className="welcome-orbit welcome-orbit-one" />
      <div aria-hidden="true" className="welcome-orbit welcome-orbit-two" />

      <div className="welcome-inner">
        <section className="welcome-hero">
          <div className="welcome-copy">
            <motion.div {...appear(0.05)} className="welcome-kicker" data-testid="text-welcome-eyebrow">
              <span className="welcome-live-dot" />
              تجربة بابلو في مصر
            </motion.div>

            <motion.h1 {...appear(0.15)} className="welcome-title" data-testid="text-welcome-title">
              مشوارك
              <span>على مزاجك.</span>
            </motion.h1>

            <motion.p {...appear(0.25)} className="welcome-description" data-testid="text-welcome-description">
              اطلب ركبتك وإنت في فرشتك 👌🏻
              <br />
              مع بابلو، سلامتك تهمنا علشان مفيش أوفر مننا.
            </motion.p>

            <motion.div {...appear(0.35)} className="welcome-actions">
              <button
                type="button"
                onClick={onContinue}
                data-testid="button-welcome-continue"
                className="welcome-cta press"
              >
                خلّينا نبدأ
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <Link
                href="/sign-in"
                onClick={onContinue}
                data-testid="link-welcome-signin"
                className="welcome-signin"
              >
                عندك حساب؟ <span>ادخل</span>
              </Link>
            </motion.div>

            <motion.div {...appear(0.45)} className="welcome-reassurance" data-testid="text-welcome-reassurance">
              <ShieldCheck aria-hidden="true" className="h-[17px] w-[17px]" />
              <span>خطوات واضحة، وكباتن محليين في محافظتك</span>
            </motion.div>
          </div>

          <motion.div
            {...appear(0.2)}
            className="welcome-art"
            aria-label="رسم توضيحي لطريق رحلة في المدينة"
            role="img"
            data-testid="illustration-welcome-route"
          >
            <div className="art-topline">
              <span>من هنا</span>
              <span className="art-coordinate">30°02′N&nbsp; 31°14′E</span>
            </div>
            <svg className="city-map" viewBox="0 0 440 300" fill="none" aria-hidden="true">
              <path d="M-18 60 93 126l67-21 88 49 87-23 124 69" className="map-road map-road-wide" />
              <path d="m39-12 57 87-4 85 79 53 40 102" className="map-road" />
              <path d="m195-10-13 94 54 72-21 66 81 84" className="map-road" />
              <path d="m354-12-47 76 29 73-31 60 60 104" className="map-road" />
              <path d="m-8 232 90-49 63 18 46-51 77 10 67-56 112-5" className="map-road" />
              <path d="m56 302 81-62 67 10 55-57 65 13 80-61" className="map-road" />
              <path d="M72 68 128 104l54-20 57 52 63-22 64 50" className="map-route-underlay" />
              <path d="M72 68 128 104l54-20 57 52 63-22 64 50" className="map-route" />
              {routePoints.slice(1, -1).map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r="3.5" className="map-route-stop" />
              ))}
              <motion.g
                aria-hidden="true"
                className="welcome-route-car welcome-route-car-lead"
                initial={reduceMotion ? false : { x: 72, y: 68 }}
                animate={{ x: reduceMotion ? 366 : [72, 128, 182, 239, 302, 366], y: reduceMotion ? 164 : [68, 104, 84, 136, 114, 164] }}
                transition={{ duration: 2.1, delay: reduceMotion ? 0 : 0.15, ease: "easeInOut" }}
              >
                <rect x="-11" y="-6" width="22" height="12" rx="4" className="route-car-shell" />
                <path d="m-5-5 2-3h6l3 3" className="route-car-window" />
                <circle cx="-6.5" cy="6" r="2" className="route-car-wheel" />
                <circle cx="6.5" cy="6" r="2" className="route-car-wheel" />
                <path d="M9-2h3v4H9" className="route-car-light" />
              </motion.g>
              <motion.g
                aria-hidden="true"
                className="welcome-route-car welcome-route-car-follow"
                initial={reduceMotion ? false : { x: 128, y: 104 }}
                animate={{ x: reduceMotion ? 302 : [128, 182, 239, 302], y: reduceMotion ? 114 : [104, 84, 136, 114] }}
                transition={{ duration: 1.65, delay: reduceMotion ? 0 : 0.58, ease: "easeInOut" }}
              >
                <rect x="-9" y="-5" width="18" height="10" rx="3.5" className="route-car-shell route-car-shell-secondary" />
                <path d="m-4-4 2-2h4l2 2" className="route-car-window" />
                <circle cx="-5.5" cy="5" r="1.7" className="route-car-wheel" />
                <circle cx="5.5" cy="5" r="1.7" className="route-car-wheel" />
                <path d="M7-2h3v3H7" className="route-car-light" />
              </motion.g>
            </svg>

            <div className="map-label map-label-market">وسط البلد</div>
            <div className="map-label map-label-river">النيل</div>
            <div className="map-landmark landmark-one" />
            <div className="map-landmark landmark-two" />
            <div className="map-landmark landmark-three" />

            <motion.div
              className="pickup-pin"
              animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <MapPin aria-hidden="true" />
            </motion.div>
            <div className="destination-pin"><Navigation aria-hidden="true" /></div>

            <motion.div
              className="trip-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <span className="trip-card-icon"><Route aria-hidden="true" /></span>
              <span className="trip-card-copy">
                <strong>من منطقتك لحد بابك</strong>
                <small>مشوار بسيط، من غير لف كتير</small>
              </span>
              <span className="trip-card-arrow"><ArrowLeft aria-hidden="true" /></span>
            </motion.div>
            <span className="art-index">01 / 03</span>
          </motion.div>
        </section>

        <motion.div {...appear(0.55)} className="welcome-bottom">
          <div className="welcome-steps" data-testid="text-welcome-how-it-works">
            <span className="step-mark">١</span><span>حدّد مشوارك</span>
            <i />
            <span className="step-mark">٢</span><span>كابتن يقبل</span>
            <i />
            <span className="step-mark">٣</span><span>توصل بالسلامة</span>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="welcome-skip"
            data-testid="button-welcome-skip"
          >
            تخطّي المقدمة
          </button>
        </motion.div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#15232a]/10 py-4" data-testid="section-welcome-support">
          <span className="text-xs font-semibold text-[#15232a]/60">محتاج مساعدة؟ خدمة عملاء بابلو</span>
          <div className="flex gap-2">
            <a href="tel:+201210108856" data-testid="link-welcome-support-call" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#15232a] px-3 text-xs font-bold text-[#f7c928]"><Phone className="h-4 w-4" />اتصل</a>
            <a href="https://wa.me/201210108856" target="_blank" rel="noreferrer" data-testid="link-welcome-support-whatsapp" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#15232a]/15 px-3 text-xs font-bold text-[#15232a]"><MessageCircle className="h-4 w-4" />واتساب</a>
          </div>
        </div>
      </div>
    </div>
  );
}
