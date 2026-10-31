const base = import.meta.env.BASE_URL;
export default function Slide6() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F4F8F7_100%)]" />
      <div className="blob blob-coral left-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-gold right-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <header className="absolute right-[7vw] top-[7vh] w-[86vw]">
        <h1 className="mt-[1.4vh] text-[3.7vw] font-bold leading-tight text-primary">الموتوسيكل للركاب والمنتجات</h1>
      </header>
      <div className="absolute right-[7vw] top-[26vh] h-[58vh] w-[41vw] overflow-hidden rounded-[2.2vw] shadow-lg">
        <img src={`${base}pablo-delivery.png`} crossOrigin="anonymous" alt="كابتن توصيل بخوذة يسلم طردًا صغيرًا في شارع مصري" className="h-full w-full object-cover" />
      </div>
      <section className="absolute left-[7vw] top-[28vh] w-[39vw] space-y-[4.2vh]">
        <p className="border-b border-primary/15 pb-[2vh] text-[2.15vw] font-semibold">رحلة راكب بالموتوسيكل</p>
        <p className="border-b border-primary/15 pb-[2vh] text-[2.15vw] font-semibold">توصيل منتجات داخل المحافظة</p>
        <p className="border-b border-primary/15 pb-[2vh] text-[2vw] leading-relaxed">بيانات المستلم ووصف المنتج مطلوبة في التوصيل</p>
        <p className="text-[2vw] leading-relaxed">تفاصيل السعر تظهر قبل إرسال الطلب</p>
      </section>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-muted">٠٦ / ١٢</div>
    </main>
  );
}