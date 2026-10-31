const base = import.meta.env.BASE_URL;
export default function Slide1() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-bg text-text" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#FAFBFC_0%,#F2F7F8_100%)]" />
      <div className="blob blob-gold right-[1vw] top-[1vh] h-[22vw] w-[22vw]" />
      <div className="blob blob-teal left-[1vw] bottom-[1vh] h-[22vw] w-[22vw]" />
      <div className="absolute left-[6vw] top-[17vh] h-[66vh] w-[43vw] overflow-hidden rounded-[2.4vw] border border-white/80 shadow-xl">
        <img src={`${base}pablo-hero.png`} crossOrigin="anonymous" alt="سيارة وموتوسيكل على شارع قاهري مرسوم" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-[24vh] bg-gradient-to-t from-[#14233D]/65 to-transparent" />
        <div className="absolute bottom-[3vh] left-[3vw] rounded-full bg-[#FFD000] px-[1.5vw] py-[1vh] text-[1.55vw] font-bold text-primary">بابلو</div>
      </div>
      <div className="absolute right-[7vw] top-[13vh] w-[41vw]">
        <h1 className="mt-[3vh] text-[5.2vw] font-bold leading-[1.12] tracking-tight text-primary">بابلو — مشوارك أسهل</h1>
        <p className="mt-[3vh] max-w-[38vw] text-[2.25vw] font-semibold leading-relaxed text-text">اطلب رحلتك وإنت في فرشتك؛ سلامتك تهمنا.</p>
        <div className="mt-[4vh] h-[0.55vh] w-[9vw] rounded-full bg-[#FFD000]" />
        <p className="mt-[2.4vh] text-[2vw] leading-relaxed text-muted">منصة تجريبية للرحلات وتوصيل المنتجات</p>
        <div className="mt-[3vh] space-y-[1.1vh] text-[1.6vw] leading-relaxed">
          <p>إعداد: <span dir="ltr" className="font-semibold">Marwan Atef Abdelwahed Ali</span></p>
          <p>المشرف: <span dir="ltr" className="font-semibold">Taha Mahmoud Metwally Nour El-Dein</span></p>
        </div>
        <p className="mt-[2.5vh] text-[1.5vw] font-semibold text-primary"><span dir="ltr">Replit • Nordpoints</span> <span className="font-normal text-muted">(علامتان نصيتان مؤقتتان)</span></p>
      </div>
      <div className="absolute bottom-[4vh] right-[7vw] text-[1.5vw] font-semibold text-muted">٠١ / ١٢</div>
    </main>
  );
}