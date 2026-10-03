// Netlify Function: brauzer -> bu funksiya -> Anthropic API. Kalit faqat serverda (env) turadi.
const SYSTEM = "Sen Nova AI — do'stona, qisqa va aniq javob beradigan suhbatdosh yordamchisan. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (asosan o'zbek tilida). Javobni oddiy matn ko'rinishida yoz, markdown belgilarsiz.";
const json = (code, obj) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST kerak" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "ANTHROPIC_API_KEY sozlanmagan" });
  let msgs;
  try { msgs = JSON.parse(event.body).messages; } catch { return json(400, { error: "Noto'g'ri so'rov" }); }
  if (!Array.isArray(msgs) || !msgs.length) return json(400, { error: "Xabar yo'q" });
  msgs = msgs.slice(-20)
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json(400, { error: "Noto'g'ri tartib" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.MODEL || "claude-haiku-4-5-20251001", max_tokens: 700, system: SYSTEM, messages: msgs })
    });
    const d = await r.json();
    if (!r.ok) return json(502, { error: d.error?.message || "API xatosi" });
    return json(200, { reply: d.content.filter(c => c.type === "text").map(c => c.text).join("") });
  } catch (e) { return json(502, { error: "Ulanib bo'lmadi" }); }
};
