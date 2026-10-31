const base = import.meta.env.BASE_URL;
export default function Slide12() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-primary text-white" dir="rtl">
      <img src={`${base}pablo-closing.png`} crossOrigin="anonymous" alt="خلفية تجريدية بأشكال عضوية ومسار طريق بألوان بابلو" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#1E3A5F/80_0%,#14233D/90_100%)]" />
      <div className="blob blob-gold right-[1vw] top-[1vh] h-[22vw] w-[22vw] opacity-40" />
      <div className="blob blob-teal left-[1vw] bottom-[1vh] h-[22vw] w-[22vw] opacity-50" />
      <div className="absolute right-[9vw] top-[19vh] w-[70vw]">
        <h1 className="mt-[3vh] text-[6vw] font-bold leading-[1.1]">شكرًا لكم</h1>
        <p className="mt-[3vh] text-[2.5vw] font-semibold leading-relaxed">بابلو — رحلتك أسهل، وسلامتك تهمنا.</p>
        <div className="mt-[5vh] h-[0.55vh] w-[10vw] rounded-full bg-[#FFD000]" />
        <p className="mt-[3vh] text-[1.75vw]">إعداد: <span dir="ltr" className="font-semibold">Marwan Atef Abdelwahed Ali</span></p>
        <p className="mt-[1.2vh] text-[1.75vw]">المشرف: <span dir="ltr" className="font-semibold">Taha Mahmoud Metwally Nour El-Dein</span></p>
        <p className="mt-[3vh] text-[1.6vw] font-semibold"><span dir="ltr">Replit • Nordpoints</span> <span className="font-normal text-white/70">(علامتان نصيتان مؤقتتان)</span></p>
      </div>
      <div className="absolute bottom-[4vh] left-[7vw] text-[1.5vw] font-semibold text-white/75">١٢ / ١٢</div>
    </main>
  );
}