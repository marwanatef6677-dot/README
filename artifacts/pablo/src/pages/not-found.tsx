import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <p className="font-num text-8xl font-bold text-foreground/10">404</p>
      <h1 className="-mt-6 font-display text-3xl font-black">الطريق ده مقفول</h1>
      <p className="mt-2 text-muted-foreground">الصفحة اللي بتدور عليها مش موجودة.</p>
      <div className="mt-6 h-2 w-48 overflow-hidden rounded-full"><div className="road-stripes animate-drive h-full w-[200%]" /></div>
      <Link href="/" data-testid="link-404-home" className="press mt-8 rounded-2xl bg-[#10151d] px-5 py-3 font-display font-bold text-[#ffd000]">ارجع للرئيسية</Link>
    </div>
  );
}
