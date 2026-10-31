const base = import.meta.env.BASE_URL;
export default function Slide10() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F2F7F8_100%)]" />
      <div className="blob blob-teal right-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-coral left-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <header className="absolute right-[7vw] top-[7vh] w-[86vw]">
        <h1 className="mt-[1.4vh] text-[3.8vw] font-bold leading-tight text-primary">دعم وتقييم بعد الرحلة</h1>
      </header>
      <div className="absolute left-[7vw] top-[25vh] h-[58vh] w-[39vw] overflow-hidden rounded-[2.2vw] shadow-lg">
        <img src={`${base}pablo-support.png`} crossOrigin="anonymous" alt="موظف دعم ودود أمام واجهة محادثة رمزية" className="h-full w-full object-cover" />
      </div>
      <section className="absolute right-[7vw] top-[27vh] w-[43vw] space-y-[3.6vh]">
        <p className="text-[2vw] leading-relaxed">إجابات مساعدة سريعة ومحادثة دعم بالذكاء الاصطناعي</p>
        <p className="text-[2vw] leading-relaxed">إرسال بلاغ للدعم ومتابعة رد الإدارة داخل التطبيق</p>
        <p className="text-[2vw] leading-relaxed">تقييم الكابتن والقيادة ونظافة المركبة والراحة</p>
        <p className="text-[2vw] leading-relaxed">تقييم مستقل لتجربة العميل مع بابلو</p>
      </section>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-muted">١٠ / ١٢</div>
    </main>
  );
}