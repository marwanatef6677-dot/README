export default function Slide8() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F4F8F8_100%)]" />
      <div className="blob blob-gold right-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-teal left-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <header className="absolute right-[7vw] top-[7vh]">
        <h1 className="mt-[1.4vh] text-[3.7vw] font-bold leading-tight text-primary">عمولة ومحفظة ومستويات للكابتن</h1>
      </header>
      <section className="absolute right-[7vw] top-[25vh] grid w-[86vw] grid-cols-2 gap-x-[4vw] gap-y-[3vh]">
        <article className="flex min-h-[24vh] items-center gap-[2vw] border-b border-primary/15 pb-[2vh]">
          <p className="text-[2vw] leading-relaxed">عمولة بابلو <strong className="text-[5vw] font-bold leading-none text-accent">٢٠٪</strong> من الأجرة، تُحجز عند قبول الرحلة</p>
        </article>
        <article className="flex min-h-[24vh] items-center gap-[2vw] border-b border-primary/15 pb-[2vh]">
          <strong className="text-[6.5vw] font-bold leading-none text-[#DD7253]">٢</strong>
          <p className="text-[2vw] leading-relaxed">تُعفى أول رحلتين مكتملتين من العمولة</p>
        </article>
        <article className="min-h-[20vh] rounded-[1.5vw] bg-[#1E3A5F] px-[2vw] py-[2.5vh] text-white">
          <p className="text-[2vw] leading-relaxed">يحتاج الكابتن إلى رصيد كافٍ لحجز العمولة عند القبول</p>
        </article>
        <article className="min-h-[20vh] rounded-[1.5vw] bg-[#0D9488]/12 px-[2vw] py-[2.5vh]">
          <p className="text-[2vw] leading-relaxed">يرتفع المستوى من ٠ إلى ١٠ كل ١٠ رحلات مكتملة، مع شارة داخل التطبيق</p>
        </article>
      </section>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-muted">٠٨ / ١٢</div>
    </main>
  );
}