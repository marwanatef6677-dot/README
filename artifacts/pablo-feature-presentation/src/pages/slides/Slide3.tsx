const base = import.meta.env.BASE_URL;
export default function Slide3() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F1F6F7_100%)]" />
      <div className="blob blob-gold left-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-teal right-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <header className="absolute right-[7vw] top-[7vh] w-[86vw]">
        <h1 className="mt-[1.4vh] text-[3.6vw] font-bold leading-tight text-primary">من اختيار الموقع إلى إرسال الطلب</h1>
      </header>
      <div className="absolute left-[7vw] top-[25vh] h-[58vh] w-[39vw] overflow-hidden rounded-[2.2vw] shadow-lg">
        <img src={`${base}pablo-map.png`} crossOrigin="anonymous" alt="خريطة مدينة مبسطة بمسار ودبوسي انطلاق ووصول" className="h-full w-full object-cover" />
      </div>
      <section className="absolute right-[7vw] top-[27vh] w-[43vw] space-y-[4vh]">
        <div className="flex items-start gap-[1.8vw]"><span className="font-display text-[3vw] font-bold text-accent">١</span><p className="pt-[0.6vh] text-[2vw] leading-relaxed">ابحث عن المكان بالاسم أو حرّك دبوس الخريطة</p></div>
        <div className="flex items-start gap-[1.8vw]"><span className="font-display text-[3vw] font-bold text-accent">٢</span><p className="pt-[0.6vh] text-[2vw] leading-relaxed">اكتب العنوان يدويًا عند الحاجة</p></div>
        <div className="flex items-start gap-[1.8vw]"><span className="font-display text-[3vw] font-bold text-accent">٣</span><p className="pt-[0.6vh] text-[2vw] leading-relaxed">اختر المحافظة ونوع الخدمة والمركبة</p></div>
        <div className="flex items-start gap-[1.8vw]"><span className="font-display text-[3vw] font-bold text-accent">٤</span><p className="pt-[0.6vh] text-[2vw] leading-relaxed">راجع المسار والسعر ثم أرسل الطلب</p></div>
      </section>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-muted">٠٣ / ١٢</div>
    </main>
  );
}