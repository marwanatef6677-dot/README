export default function Slide9() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F7F6F1_100%)]" />
      <div className="blob blob-coral right-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-gold left-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <header className="absolute right-[7vw] top-[7vh]">
        <h1 className="mt-[1.4vh] text-[3.8vw] font-bold leading-tight text-primary">عجلة خصم أسبوعية للعميل</h1>
      </header>
      <section className="absolute right-[7vw] top-[25vh] w-[86vw]">
        <div className="flex items-center gap-[2vw] rounded-[2vw] bg-[#FFD000]/25 px-[2.5vw] py-[2.3vh]">
          <p className="text-[2vw] font-semibold">لفة واحدة لكل عميل كل <strong className="text-[5vw] font-bold leading-none text-primary">٧ أيام</strong></p>
        </div>
        <div className="mt-[3vh] grid grid-cols-2 gap-x-[4vw] gap-y-[3.4vh]">
          <p className="border-t-[0.45vh] border-accent pt-[1.7vh] text-[2vw] leading-relaxed">أكواد خصم من ٣٪ إلى ٣٠٪، مع احتمال «حظ أوفر»</p>
          <p className="border-t-[0.45vh] border-[#DD7253] pt-[1.7vh] text-[2vw] leading-relaxed">العميل يدخل الكود يدويًا؛ صالح لرحلة ركاب مكتملة واحدة</p>
          <p className="col-span-2 rounded-[1.5vw] bg-[#1E3A5F] px-[2.2vw] py-[2.1vh] text-[2vw] leading-relaxed text-white">بابلو يتحمل الخصم ويعوّض الكابتن في المحفظة بعد إتمام الرحلة</p>
        </div>
      </section>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-muted">٠٩ / ١٢</div>
    </main>
  );
}