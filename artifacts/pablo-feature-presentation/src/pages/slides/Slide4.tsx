export default function Slide4() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F4F7F9_100%)]" />
      <div className="blob blob-coral right-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-gold left-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <header className="absolute right-[7vw] top-[7vh]">
        <h1 className="mt-[1.4vh] text-[3.6vw] font-bold leading-tight text-primary">خدمات وأسعار تجريبية واضحة</h1>
      </header>
      <section className="absolute right-[7vw] top-[25vh] grid w-[86vw] grid-cols-3 gap-[1.6vw]">
        <article className="min-h-[31vh] rounded-[1.8vw] bg-[#1E3A5F] px-[2vw] py-[2.7vh] text-white">
          <p className="text-[2vw] leading-[1.55] text-white">السيارة: ٢٠ جنيه بداية + ١٠ لكل كم + ١ لكل دقيقة؛ حد أدنى ٤٠ جنيهًا</p>
        </article>
        <article className="min-h-[31vh] rounded-[1.8vw] bg-[#0D9488]/12 px-[2vw] py-[2.7vh]">
          <p className="text-[2vw] leading-[1.55]">راكب موتوسيكل: ١٥ بداية + ٨ لكل كم + ١ لكل دقيقة؛ حد أدنى ٣٠ جنيهًا</p>
        </article>
        <article className="min-h-[31vh] rounded-[1.8vw] bg-[#DD7253]/12 px-[2vw] py-[2.7vh]">
          <p className="text-[2vw] leading-[1.55]">توصيل منتجات: ٣٠ جنيه بداية + ٨ لكل كم؛ حد أدنى ٣٠ جنيهًا</p>
        </article>
      </section>
      <div className="absolute right-[7vw] top-[65vh] flex w-[86vw] items-center justify-between gap-[3vw] border-t border-primary/15 pt-[3vh]">
        <p className="w-[40vw] text-[2vw] font-semibold leading-relaxed">تعديل عرض العميل يكون بخطوات ٥ جنيهات</p>
        <p className="w-[42vw] text-[1.65vw] leading-relaxed text-muted">الأسعار تجريبية وتحتاج اعتمادًا قبل التشغيل التجاري</p>
      </div>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-muted">٠٤ / ١٢</div>
    </main>
  );
}