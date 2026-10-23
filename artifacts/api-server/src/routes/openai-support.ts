import { rateLimit } from "express-rate-limit";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { SendOpenaiSupportChatBody } from "@workspace/api-zod";
import { db, profiles } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requirePabloAuth } from "../middlewares/auth";
import { AppError } from "../lib/pablo";

const router: IRouter = Router();

const assistantRules = [
  "أنت مساعد دعم العملاء داخل تطبيق بابلو للرحلات في مصر. أجب بالعربية المصرية الواضحة وباختصار.",
  "معلومات مؤكدة: سعر الرحلة التقديري = 20 جنيه بداية + 10 جنيه لكل كيلومتر + 1 جنيه لكل دقيقة، والحد الأدنى 40 جنيهًا. التطبيق يعرض السعر التقديري قبل الطلب.",
  "الدفع للرحلة نقدًا في النسخة الحالية. لا تقل إن فوري أو الدفع الإلكتروني متاح للعميل إلا إذا ظهر ذلك صراحة في التطبيق.",
  "يظهر التواصل مع الكابتن بعد قبوله الطلب. ويمكن للعميل متابعة موقعه من صفحة الرحلة أثناء الرحلة إذا كان الكابتن يشارك موقعه.",
  "لا تخمّن حالة رحلة معينة أو موقع كابتن أو وقت وصول أو قرار استرداد أموال. وجّه العميل إلى صفحة الرحلة أو اطلب منه تسجيل بلاغ.",
  "إذا لم تكن الإجابة مؤكدة، قل ذلك بوضوح وشجّع العميل على اختيار «تسجيل بلاغ للدعم». لا تعد بوقت حل أو استرداد.",
  "لا تطلب كلمات مرور أو أكواد تحقق أو بيانات بطاقة. لا تنفّذ أي تغيير في رحلة أو محفظة؛ هذه الدردشة للإرشاد فقط.",
  "لو وصف العميل خطرًا عاجلًا، وجّهه للتواصل فورًا مع خدمات الطوارئ المحلية، ولا تقدّم ضمانات أمان.",
  "لا تكشف تفاصيل تشغيلية داخلية مثل عمولة الكابتن أو بيانات مستخدمين آخرين.",
].join("\n");

const supportChatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_req, res) => String(res.locals.userId ?? "unknown"),
  message: { error: "استخدم المساعد بهدوء وحاول مرة أخرى بعد دقيقة." },
});

router.post("/openai/support-chat", requirePabloAuth, supportChatLimiter, async (req, res): Promise<void> => {
  const parsed = SendOpenaiSupportChatBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "اكتب رسالتك بشكل صحيح ثم حاول مرة أخرى.");

  const userId: string = res.locals.userId;
  const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId));
  if (profile?.role !== "customer") throw new AppError(403, "مساعد الدعم متاح لحسابات العملاء فقط.");

  const messages = parsed.data.messages.slice(-10);
  if (messages.at(-1)?.role !== "user") throw new AppError(400, "أرسل رسالة جديدة للمساعد.");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      stream: true,
      messages: [
        { role: "system", content: assistantRules },
        ...messages.map(({ role, content }) => ({ role, content })),
      ],
    });

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (typeof content === "string" && content.length > 0) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    req.log.error({ err: error }, "OpenAI support response failed");
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "المساعد غير متاح الآن. سجّل بلاغًا وسيراجعه المالك." })}\n\n`);
      res.end();
      return;
    }
    throw new AppError(503, "المساعد غير متاح الآن. يمكنك تسجيل بلاغ للدعم.");
  }
});

export default router;
