import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { Wordmark } from "@/components/bits";
import { basePath, loadDraft } from "@/lib/pablo";

function AuthFrame({ children, title }: { children: React.ReactNode; title: string }) {
  const draft = loadDraft();
  const hasDraft = !!(draft.pickup || draft.destination);
  return (
    <div className="grid min-h-[100dvh] md:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-[#10151d] p-10 text-[#f6f1e4] md:flex md:flex-col md:justify-between">
        <Link href="/" data-testid="link-auth-home"><Wordmark light /></Link>
        <div className="pointer-events-none absolute -bottom-20 -left-10 font-display text-[26rem] font-black leading-none text-[#ffd000]/[0.07]">P</div>
        <div className="relative">
          <h1 className="font-display text-5xl font-black leading-tight">{title}</h1>
          <p className="mt-4 font-display text-2xl text-[#ffd000]">رحلتك أسهل .. مع بابلو</p>
          <div className="mt-8 h-3 w-72 overflow-hidden rounded-full"><div className="road-stripes animate-drive h-full w-[200%]" /></div>
        </div>
        <p className="relative text-sm text-[#f6f1e4]/50">نسخة تجريبية · طلبات تجربة بس</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-10">
        <Link href="/" className="md:hidden" data-testid="link-auth-home-mobile"><Wordmark /></Link>
        {hasDraft && <p className="w-[440px] max-w-full rounded-2xl bg-accent px-4 py-3 text-sm" data-testid="text-auth-draft">محفوظ لك طلب «{draft.pickup || "..."} ← {draft.destination || "..."}». هتلاقيه مستنيك بعد الدخول، ومش هيتبعت غير لما تدوس اطلب.</p>}
        {children}
      </div>
    </div>
  );
}

export function SignInPage() {
  return <AuthFrame title="أهلاً بيك تاني."><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/book`} /></AuthFrame>;
}
export function SignUpPage() {
  return <AuthFrame title="مشوارك الجاي يبدأ من هنا."><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/account`} /></AuthFrame>;
}
