import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CarFront, ClipboardCheck, Hand, Smartphone, Route as RouteIcon } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { Monogram, PilotNotice } from "@/components/bits";
import { useConfig } from "@/hooks/use-pablo";

const steps = [
  { icon: RouteIcon, t: "حط الدبوسين", b: "اضغط على الخريطة لنقطة الركوب والوصول، واختار محافظتك ونوع العربية. ولو حابب نجيب مكانك من الموبايل." },
  { icon: Hand, t: "كابتن يقبل", b: "الطلب بيظهر لكباتن التجربة المسجلين في نفس المحافظة. أول واحد يقبل بيظهر لك اسمه ورقمه وعربيته." },
  { icon: ClipboardCheck, t: "تابع خطوة بخطوة", b: "وصل، بدأ، خلص. الحالة بتتحدث لوحدها كل كام ثانية، وفي الآخر تقيّم الرحلة." },
];

export default function Home() {
  const config = useConfig();
  return (
    <div>
      <section className="relative overflow-hidden bg-[#10151d] text-[#f6f1e4]">
        <div className="pointer-events-none absolute -left-24 top-10 font-display text-[22rem] font-black leading-none text-[#ffd000]/[0.06] select-none">P</div>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div className="relative">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 rounded-full border border-[#ffd000]/30 px-3 py-1 text-xs text-[#ffd000]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffd000]" /> تجربة مفتوحة في محافظات مصر
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="mt-6 font-display text-5xl font-black leading-[1.15] md:text-7xl">
              رحلتك أسهل
              <span className="mt-2 block text-[#ffd000]">.. مع بابلو</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 max-w-md text-lg leading-relaxed text-[#f6f1e4]/75">
              اكتب رايح فين، واختار العربية، وسيب الباقي على كباتن بابلو. من غير لف، ومن غير مكالمات كتير.
            </motion.p>
            <div className="mt-8 h-3 w-full max-w-md overflow-hidden rounded-full bg-[#ffd000]/10"><div className="road-stripes animate-drive h-full w-[200%]" /></div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <Link href="/sign-up" data-testid="link-hero-signup" className="press inline-flex items-center gap-2 rounded-full bg-[#ffd000] px-5 py-3 font-display font-bold text-[#10151d]">ابدأ حساب جديد <ArrowLeft className="h-4 w-4" /></Link>
              <a href="#captains" data-testid="link-captains" className="rounded-full border border-[#f6f1e4]/20 px-5 py-3 font-semibold hover:bg-[#f6f1e4]/5">أنا كابتن</a>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 30, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="rounded-[2rem] bg-background p-4 text-foreground shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">اطلب مشوار</h2>
              <span className="checker h-4 w-16 rounded-sm" />
            </div>
            <BookingForm signedIn={false} />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <PilotNotice text={config.data?.notice} />
        <div className="mt-14 grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-4xl font-black leading-tight">تلات خطوات<br /><span className="bg-[#ffd000] px-2">وبس.</span></h2>
          <ol className="space-y-8">
            {steps.map((s, i) => (
              <motion.li key={s.t} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex gap-5">
                <span className="font-num text-4xl font-bold text-foreground/15">0{i + 1}</span>
                <div className="border-r-2 border-[#ffd000] pr-5">
                  <h3 className="flex items-center gap-2 font-display text-xl font-bold"><s.icon className="h-5 w-5" />{s.t}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">{s.b}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section id="captains" className="grid-faint border-y border-foreground/10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#10151d] px-3 py-1 text-xs text-[#ffd000]"><CarFront className="h-3.5 w-3.5" /> للكباتن</span>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight">عندك عربية؟<br />جرّب معانا.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">سجّل كابتن بنوع العربية ورقم اللوحة، وهتشوف طلبات التجربة اللي في محافظتك بس. اقبل الطلب وحدّث حالته لحد ما الرحلة تخلص. التسجيل ذاتي ومفيش مراجعة أوراق لسه في النسخة دي.</p>
            <Link href="/sign-up" data-testid="link-captain-signup" className="press mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#10151d] px-5 py-3 font-display font-bold text-[#ffd000]">سجّل ككابتن <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          <div className="relative mx-auto w-full max-w-sm rotate-2 rounded-[2rem] border-2 border-[#10151d] bg-[#ffd000] p-6 shadow-[10px_10px_0_#10151d]">
            <p className="font-display text-sm font-bold">شكل الطلب عند الكابتن</p>
            <div className="mt-4 space-y-3 rounded-2xl bg-background p-4 text-sm">
              <div className="flex gap-2"><span className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#10151d] bg-[#ffd000]" /><span>نقطة الركوب اللي كتبها الراكب</span></div>
              <div className="flex gap-2"><span className="mt-1.5 h-2.5 w-2.5 rounded-sm bg-[#10151d]" /><span>الوجهة</span></div>
              <div className="rounded-xl bg-[#10151d] py-2 text-center font-display font-bold text-[#ffd000]">اقبل الطلب</div>
            </div>
            <p className="mt-3 text-xs text-[#10151d]/70">ده توضيح للشكل بس، مش طلب حقيقي.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-[#10151d] p-8 text-[#f6f1e4] md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Smartphone className="h-10 w-10 text-[#ffd000]" />
            <div><h3 className="font-display text-2xl font-bold">خلّي بابلو على شاشتك</h3><p className="mt-1 text-[#f6f1e4]/70">تقدر تثبّته من صفحة حسابك بعد الدخول، أو من قايمة المتصفح.</p></div>
          </div>
          <Link href="/sign-in" data-testid="link-install-signin" className="press rounded-2xl bg-[#ffd000] px-5 py-3 font-display font-bold text-[#10151d]">ادخل حسابك</Link>
        </div>
      </section>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2"><Monogram className="h-6 w-6" /> بابلو — رحلتك أسهل .. مع بابلو</span>
          <span>نسخة تجريبية · مفيش دفع أونلاين</span>
        </div>
      </footer>
    </div>
  );
}
