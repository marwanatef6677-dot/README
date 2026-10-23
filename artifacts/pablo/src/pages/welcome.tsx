import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, MapPin, Navigation, Route, ShieldCheck } from "lucide-react";
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
              مكانك، وجهتك، وكابتن من منطقتك. بابلو يسهّل الطريق من أول دبوس لحد ما توصل.
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
      </div>
    </div>
  );
}
