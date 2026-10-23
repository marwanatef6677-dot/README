import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Wordmark } from "@/components/bits";

export default function DriverTerms() {
  return (
    <main dir="rtl" className="min-h-[100dvh] bg-[#f6f1e4] px-4 py-6 text-[#10151d] sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" data-testid="link-driver-terms-home"><Wordmark /></Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"><ArrowRight className="h-4 w-4" /> رجوع</Link>
        </header>

        <article className="rounded-3xl border border-[#10151d]/10 bg-white p-5 shadow-sm sm:p-9">
          <div className="mb-7 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950" role="note" data-testid="notice-driver-legal-draft">
            <strong>مسودة للمراجعة القانونية:</strong> هذا إقرار تشغيلي أولي، وليس استشارة قانونية أو تأكيدًا على استيفاء متطلبات القانون المصري. راجعه مع محامٍ مصري قبل التشغيل الفعلي.
          </div>

          <p className="text-xs font-bold tracking-wide text-muted-foreground">بابلو · إقرار الكابتن · الإصدار ٢</p>
          <h1 className="mt-2 font-display text-3xl font-black">إقرار ومستندات الكابتن</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            مقدم الخدمة المذكور في هذه المسودة: مروان عاطف عبد الواحد علي. للاستفسارات والشكاوى:
            {" "}<a className="font-semibold underline" href="mailto:marwan.atef6677@gmail.com">marwan.atef6677@gmail.com</a>.
          </p>

          <div className="mt-7 space-y-6 text-sm leading-7">
            <section>
              <h2 className="font-display text-lg font-bold">١. صحة البيانات والمستندات</h2>
              <p className="mt-1">بإرسال طلب اعتمادك، تقر بأن بيانات حسابك صحيحة، وأن رخصة القيادة ورخصة المركبة المرفوعتين تخصانك أو تخصان المركبة المسجلة، وأنهما أصليتان وساريتان بحسب ما تعلم. تتعهد بإبلاغ الإدارة عند انتهاء أي مستند أو تغيّر بياناته، وعدم استخدام حسابك لقيادة مركبة أو تقديم خدمة غير مسموح بها لك.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٢. صور المستندات والخصوصية</h2>
              <p className="mt-1">يرفع الكابتن الوجهين الأمامي والخلفي لرخصة القيادة ورخصة المركبة. تحفظ الصور في مساحة خاصة، وتتاح للإدارة المصرح لها فقط للمراجعة وإعادة المراجعة؛ لا تظهر للعميل أو للكباتن الآخرين. تظل مدة الاحتفاظ النهائية بحاجة إلى مراجعة قانونية قبل التشغيل التجاري.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٣. مراجعة الإدارة قبل قبول الرحلات</h2>
              <p className="mt-1">رفع الصور أو توقيع هذا الإقرار لا يعني اعتمادك. لا يمكنك قبول أي طلب إلا بعد مراجعة الإدارة للمستندات والبيانات وإتمام اعتماد الحساب داخل بابلو. قد تطلب الإدارة مستندًا أو توضيحًا إضافيًا، ويجب تحديث المستندات إذا انتهت صلاحيتها أو تغيرت.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٤. حالة النسخة التجريبية</h2>
              <p className="mt-1">بابلو في وضع تجريبي. التسجيل أو اعتماد الحساب داخل التطبيق لا يمثل تصريحًا حكوميًا أو بديلًا عن أي ترخيص أو تأمين أو موافقة قد تكون مطلوبة. لا تبدأ نقل ركاب حقيقيين أو تحصيل أموال قبل اعتماد المتطلبات التشغيلية والقانونية من الجهات المختصة والإدارة.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٥. التوقيع والتحديثات</h2>
              <p className="mt-1">عند وضع علامة الموافقة وكتابة اسمك المسجل، يحفظ التطبيق الاسم المكتوب وإقرارك ووقت الموافقة وإصدار الإقرار. هذا سجل موافقة إلكتروني داخل التطبيق، ولا يضمن بمفرده الحجية القانونية للتوقيع. قد يطلب التطبيق موافقتك مجددًا عند تحديث الإقرار.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold">٦. القانون والمراجعة</h2>
              <p className="mt-1">أُعدت هذه المسودة على أساس تطبيق القانون المصري، مع بقاء القواعد القانونية الآمرة دون انتقاص. يلزم اعتماد الصياغة النهائية، والمستندات المطلوبة، وآلية الاحتفاظ بها بواسطة محامٍ مصري قبل التشغيل التجاري.</p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-5">
            <Link href="/account" className="rounded-xl bg-[#ffd000] px-4 py-2.5 text-sm font-bold" data-testid="link-driver-terms-account">إكمال بيانات الكابتن</Link>
            <Link href="/" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">العودة إلى بابلو</Link>
          </div>
        </article>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">إصدار تجريبي ٢ · لا تستخدم هذه المسودة كبديل لمراجعة قانونية متخصصة.</p>
      </div>
    </main>
  );
}
