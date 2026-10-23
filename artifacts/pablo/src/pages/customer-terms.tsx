import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Wordmark } from "@/components/bits";

export default function CustomerTerms() {
  return (
    <main dir="rtl" className="min-h-[100dvh] bg-[#f6f1e4] px-4 py-6 text-[#10151d] sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" data-testid="link-terms-home"><Wordmark /></Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"><ArrowRight className="h-4 w-4" /> رجوع</Link>
        </header>

        <article className="rounded-3xl border border-[#10151d]/10 bg-white p-5 shadow-sm sm:p-9">
          <div className="mb-7 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950" role="note" data-testid="notice-legal-draft">
            <strong>مسودة للمراجعة القانونية:</strong> هذا النص أولي للاختبار، وليس استشارة قانونية ولا تأكيدًا على حجية التوقيع الإلكتروني. راجعه مع محامٍ مصري قبل تشغيل الخدمة فعليًا.
          </div>

          <p className="text-xs font-bold tracking-wide text-muted-foreground">بابلو · شروط العميل · الإصدار ١</p>
          <h1 className="mt-2 font-display text-3xl font-black">شروط استخدام العميل</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            تنظم هذه الشروط استخدام العميل لتطبيق بابلو. مقدم الخدمة المذكور في هذه المسودة: مروان عاطف عبد الواحد علي.
            للاستفسارات والشكاوى المتعلقة بالشروط: <a className="font-semibold underline" href="mailto:marwan.atef6677@gmail.com">marwan.atef6677@gmail.com</a>.
          </p>

          <div className="mt-7 space-y-6 text-sm leading-7">
            <section>
              <h2 className="font-display text-lg font-bold">١. السن والحساب والتوقيع</h2>
              <p className="mt-1">لا يجوز طلب رحلة كعميل إلا إذا كان عمرك ١٨ سنة أو أكثر. عليك إدخال اسمك ورقم هاتف مصري صحيحين، والمحافظة على سرية بيانات دخولك. عند وضع علامة الموافقة وكتابة اسمك المسجل، يسجل التطبيق اسم التوقيع وإقرار السن ووقت الموافقة وإصدار الشروط المرتبط بها. الإقرار بالسن ذاتي ولا يعني أن بابلو تحقق من تاريخ ميلادك أو هويتك.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٢. طبيعة الخدمة وحالتها التجريبية</h2>
              <p className="mt-1">بابلو منصة تجريبية لعرض طلبات الرحلات وربط العميل بالكابتن. بابلو ليس سائق الرحلة ولا يضمن توفر كابتن أو استمرار الخدمة دون انقطاع. استخدم التطبيق للاختبار فقط إلى أن تعلن الإدارة صراحةً بدء التشغيل الفعلي واستكمال المتطلبات اللازمة.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٣. بيانات الرحلة والأجرة</h2>
              <p className="mt-1">أدخل نقطة الركوب والوجهة وبيانات التواصل بدقة. يعرض التطبيق تقدير الأجرة قبل إرسال الطلب، وقد تختلف الأجرة النهائية وفق تفاصيل الرحلة والعرض الذي يقبله الطرفان. في النسخة التجريبية يكون الدفع نقدًا للكابتن مباشرةً، ولا يستلم بابلو أجرة العميل إلكترونيًا داخل التطبيق.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٤. مشاركة المعلومات والصور</h2>
              <p className="mt-1">قد تُستخدم بيانات الرحلة والموقع لتشغيل الطلب والتتبع. يظهر رقم الهاتف وتفاصيل الرحلة اللازمة بعد قبول الطلب. صورة الحساب اختيارية، وإذا رفعتها فستكون متاحة للمستخدمين المسجلين الدخول إلى بابلو؛ لا تجعلها متاحة للزوار غير المسجلين.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٥. الاستخدام المقبول والسلامة</h2>
              <p className="mt-1">استخدم بابلو للطلبات المشروعة فقط، ولا تدخل بيانات شخص آخر دون إذنه، ولا تستخدم التطبيق للإزعاج أو الاحتيال أو تعريض أي شخص للخطر. اتبع تعليمات السلامة، وتواصل مع خدمات الطوارئ مباشرةً عند وجود خطر عاجل.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٦. التقييم والتعليقات</h2>
              <p className="mt-1">بعد اكتمال الرحلة، يمكن للعميل تقييم الكابتن والرحلة وإرسال تعليق، كما يمكنه تقييم بابلو وإرسال ملاحظة لتحسين التطبيق. يجب ألا تتضمن التعليقات بيانات شخصية أو إساءة أو اتهامات غير موثقة.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٧. التحديثات والقانون</h2>
              <p className="mt-1">قد تُحدّث هذه الشروط بإصدار جديد؛ وقد يطلب التطبيق موافقتك مجددًا قبل طلب رحلات جديدة. أُعدت هذه المسودة على أساس تطبيق القانون المصري، مع بقاء حقوق المستهلك والقواعد القانونية الآمرة دون انتقاص. يلزم اعتماد النص النهائي ومراجعة آلية التوقيع بواسطة محامٍ مصري.</p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-5">
            <Link href="/account" className="rounded-xl bg-[#ffd000] px-4 py-2.5 text-sm font-bold" data-testid="link-terms-account">إكمال بيانات الحساب والموافقة</Link>
            <Link href="/" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">العودة إلى بابلو</Link>
          </div>
        </article>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">آخر تحديث: إصدار تجريبي ١ · لا تستخدم هذه المسودة كبديل لمراجعة قانونية متخصصة.</p>
      </div>
    </main>
  );
}
