// End-to-end test on the production build (npm run build && npm run e2e).
// Telegram is mocked with page.route so no real messages are sent during tests.
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const req_ = createRequire(import.meta.url);
const { chromium } = req_("playwright");

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = process.env.E2E_OUT ?? ROOT + "tests/e2e-out/";
mkdirSync(OUT, { recursive: true });
const PORT = 4321;
const URL_ = `http://localhost:${PORT}/`;
const bank = JSON.parse(readFileSync(ROOT + "src/data/bank.json", "utf8"));
const teacher = JSON.parse(readFileSync(ROOT + "scripts/out/bank-teacher.json", "utf8"));
const qById = new Map(bank.questions.map((q) => [q.id, q]));
const pById = new Map(bank.problems.map((p) => [p.id, p]));
const ref = (p) => readFileSync(ROOT + `scripts/out/reference/${p.key.replace("-", "_")}.fprg`, "utf8");

const fails = [];
const check = (cond, msg) => {
  if (!cond) {
    fails.push(msg);
    console.log("  ✗", msg);
  } else console.log("  ✓", msg);
};

// ---- start preview server ----
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" });
await new Promise((res) => {
  srv.stdout.on("data", (d) => String(d).includes("Local") && res());
  setTimeout(res, 8000);
});

const browser = await chromium.launch();
const tg = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...opts });
  // test hooks that run BEFORE the app loads (the app saves on pagehide, so editing storage before a reload would be overwritten)
  await ctx.addInitScript(() => {
    const K = "fg-exam:attempt:v1";
    if (sessionStorage.getItem("t:expire")) {
      const a = JSON.parse(localStorage.getItem(K));
      a.parts[0].activeSince = Date.now() - a.parts[0].remainingMs - 1000;
      localStorage.setItem(K, JSON.stringify(a));
      sessionStorage.removeItem("t:expire");
    }
    if (sessionStorage.getItem("t:dropkey")) {
      localStorage.removeItem(K);
      sessionStorage.removeItem("t:dropkey");
    }
  });
  await ctx.route("https://api.telegram.org/**", async (route) => {
    const req = route.request();
    const method = req.url().split("/").pop();
    const body = req.postDataBuffer()?.toString("latin1") ?? "";
    const fname = /filename="([^"]+)"/.exec(body)?.[1];
    tg.push({ method, fname, size: body.length });
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ ok: true, result: {} }) });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fails.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && console.log("   console:", m.text()));
  return { ctx, page };
}
const attemptOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("fg-exam:attempt:v1") || "null"));
const shot = (page, name) => page.screenshot({ path: OUT + name + ".png", fullPage: false });

// answer the current question (correct=true → right answer, false → a wrong one)
async function answerCurrent(page, a, qid, correct) {
  const q = qById.get(qid);
  const order = a.optionOrder[qid] ?? (q.options ?? []).map((_, i) => i);
  if (q.type === "single_choice") {
    const want = correct ? "ABCDE".indexOf(q.correct_answer) : ("ABCDE".indexOf(q.correct_answer) + 1) % q.options.length;
    await page.locator('[role="radio"]').nth(order.indexOf(want)).click();
  } else if (q.type === "multiple_choice") {
    const want = correct ? q.correct_answer.map((l) => "ABCDE".indexOf(l)) : [q.correct_answer.map((l) => "ABCDE".indexOf(l))[0]];
    for (const w of want) await page.locator('[role="checkbox"]').nth(order.indexOf(w)).click();
  } else if (q.type === "true_false") {
    const v = correct ? q.correct_answer : q.correct_answer === "True" ? "False" : "True";
    await page.locator('[role="radio"]').nth(v === "True" ? 0 : 1).click();
  } else {
    const txt = correct ? (Array.isArray(q.correct_answer) ? q.correct_answer[0] : q.correct_answer) : "notogri javob";
    const box = page.locator(q.type === "output" ? "textarea" : 'input[aria-label="Javob"]');
    await box.fill(txt);
    await box.blur();
  }
}

async function doQuestionPart(page, partIdx, wrongEvery) {
  let a = await attemptOf(page);
  const items = a.parts[partIdx].items;
  let expected = 0;
  for (let i = 0; i < items.length; i++) {
    a = await attemptOf(page);
    const correct = i % wrongEvery !== wrongEvery - 1;
    await answerCurrent(page, a, items[i], correct);
    if (correct) expected++;
    if (i < items.length - 1) await page.getByRole("button", { name: "Keyingi" }).click();
  }
  await page.waitForTimeout(400);
  return expected;
}

try {
  console.log("1) Welcome + start");
  const { page, ctx } = await newPage();
  await page.goto(URL_);
  await page.waitForSelector("text=Imtihonga kirish");
  await shot(page, "01-welcome-1440-light");
  await page.getByPlaceholder("Karimova").fill("Karimova");
  await page.getByPlaceholder("Malika").fill("Malika");
  await page.getByPlaceholder("8-A").fill("8-A");
  await page.getByRole("button", { name: /Imtihonni boshlash/ }).click();
  await page.waitForSelector("text=Keyingi qism");
  console.log("2) Double-click «Boshlash» must not skip a part");
  await page.getByRole("button", { name: /Boshlash/ }).dblclick();
  await page.waitForTimeout(500);
  let a = await attemptOf(page);
  check(a.phase === "exam" && a.current === 0 && a.parts[1].status === "locked", "double-click started only part 1");

  console.log("3) Part 1 with planned answers");
  const exp1 = await doQuestionPart(page, 0, 5);
  await shot(page, "02-part1-1440-light");
  console.log("4) Reload mid-exam → auto-resume with the same questions");
  const before = await attemptOf(page);
  await page.reload();
  await page.waitForSelector("text=Imtihon tiklandi");
  const after = await attemptOf(page);
  check(JSON.stringify(before.parts[0].items) === JSON.stringify(after.parts[0].items), "same questions after reload");
  check(after.phase === "exam" && Object.keys(after.answers).length === Object.keys(before.answers).length, "answers kept after reload");
  await page.getByRole("button", { name: /Qismni topshirish/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await page.waitForSelector("text=Keyingi qism");
  await page.getByRole("button", { name: /Boshlash/ }).click();

  console.log("5) Part 2");
  const exp2 = await doQuestionPart(page, 1, 4);
  await page.getByRole("button", { name: /Qismni topshirish/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await page.waitForSelector("text=Keyingi qism");
  await page.getByRole("button", { name: /Boshlash/ }).click();

  console.log("6) Part 3 uploads: AC, WA, RE, TLE, PE, re-upload");
  a = await attemptOf(page);
  const p3 = a.parts[2].items;
  const files = {};
  const mk = (name, text) => ({ name, mimeType: "application/xml", buffer: Buffer.from(text) });
  const brokenXml = "<flowgorithm><function name='Main'"; // PE
  const infinite = `<?xml version="1.0"?><flowgorithm fileversion="3.0"><function name="Main" type="None" variable=""><parameters/><body><declare name="i" type="Integer" array="False" size=""/><assign variable="i" expression="0"/><while expression="i &gt;= 0"><assign variable="i" expression="i + 1"/></while></body></function></flowgorithm>`;
  const crash = `<?xml version="1.0"?><flowgorithm fileversion="3.0"><function name="Main" type="None" variable=""><parameters/><body><declare name="i" type="Integer" array="False" size=""/><assign variable="i" expression="0"/><output expression="5 / i" newline="True"/></body></function></flowgorithm>`;
  const plan = [
    ["AC", ref(pById.get(p3[0]))],
    ["AC", ref(pById.get(p3[1]))],
    ["AC-reupload", ref(pById.get(p3[2]))],
    ["WA", ref(pById.get(p3[4])).replace(/<output expression="([^"]+)" newline="True"\/>/, '<output expression="$1 &amp; &quot;x&quot;" newline="True"/>')],
    ["RE", crash],
    ["TLE", infinite],
  ];
  const uploadAt = async (idx, file) => {
    await page.locator('nav[class*="fixed"]');
    // jump with the question map (desktop sidebar)
    await page.locator("aside").getByRole("button", { name: new RegExp(`^${idx + 1}-masala`) }).click();
    await page.locator('input[type="file"]').setInputFiles(file);
  };
  for (let k = 0; k < plan.length; k++) {
    const [kind, text] = plan[k];
    const idx = kind === "WA" ? 4 : kind === "RE" ? 5 : kind === "TLE" ? 6 : k;
    if (kind === "AC-reupload") {
      await uploadAt(idx, mk("birinchi.fprg", crash));
      await page.waitForTimeout(200);
      await page.locator('input[type="file"]').setInputFiles(mk("ikkinchi.fprg", text));
    } else await uploadAt(idx, mk(`yechim_${k}.fprg`, text));
    await page.waitForTimeout(250);
    files[p3[idx]] = kind.startsWith("AC") ? "AC" : kind;
  }
  // PE: invalid file must be rejected at upload
  await page.locator("aside").getByRole("button", { name: /^8-masala/ }).click();
  await page.locator('input[type="file"]').setInputFiles(mk("buzuq.fprg", brokenXml));
  await page.waitForSelector("text=Flowgorithm dasturi sifatida");
  check(true, "broken .fprg rejected at upload with a message");
  await page.locator('input[type="file"]').setInputFiles({ name: "rasm.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await page.waitForSelector("text=Faqat .fprg");
  check(true, "non-.fprg file rejected");
  // run samples on problem 1
  await page.locator("aside").getByRole("button", { name: /^1-masala/ }).click();
  await page.getByRole("button", { name: /Sinab koʻrish/ }).click();
  await page.waitForSelector("text=Qabul qilindi");
  check(true, "«Sinab koʻrish» shows AC on samples");
  await page.locator("aside").getByRole("button", { name: /^5-masala/ }).click();
  await page.getByRole("button", { name: /Sinab koʻrish/ }).click();
  await page.waitForSelector("text=Birinchi farq");
  check(true, "WA sample shows first differing line");
  await page.locator("aside").getByRole("button", { name: /^7-masala/ }).click();
  await page.getByRole("button", { name: /Sinab koʻrish/ }).click();
  await page.waitForSelector("text=Vaqt tugadi", { timeout: 30000 });
  check(true, "infinite loop gives TLE and the page stays responsive");
  await shot(page, "03-part3-1440-light");
  await page.getByRole("button", { name: /Qismni topshirish/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await page.waitForSelector("text=Keyingi qism");
  await page.getByRole("button", { name: /Boshlash/ }).click();

  console.log("7) Part 4 (bonus): one correct upload");
  a = await attemptOf(page);
  const p4 = a.parts[3].items;
  await page.locator('input[type="file"]').setInputFiles(mk("bonus.fprg", ref(pById.get(p4[0]))));
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Qismni topshirish/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await page.waitForSelector("text=Yakuniy koʻrib chiqish");
  await shot(page, "04-review-1440-light");

  console.log("8) Offline final submit → queued, then sent when online");
  const tgBefore = tg.length;
  await ctx.setOffline(true);
  await page.getByRole("checkbox").check();
  const hold = page.getByRole("button", { name: /yakuniy topshirish/i });
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1800);
  await page.mouse.up();
  await page.waitForSelector("text=Natijalar", { timeout: 120000 });
  await page.waitForSelector("text=Internet yoʻq", { timeout: 20000 });
  check(tg.length === tgBefore, "nothing sent while offline");
  await ctx.setOffline(false);
  await page.waitForSelector("text=Natija Telegramga yuborildi", { timeout: 60000 });
  const sent = tg.filter((t) => t.method !== "sendMessage" || true);
  const msgs = tg.filter((t) => t.method === "sendMessage").length;
  const docs = tg.filter((t) => t.method === "sendDocument");
  check(msgs === 2, `2 messages (start + result), got ${msgs}`);
  check(docs.length === 2 && docs.some((d) => /^\d\d-\d\d-\d{4}_Karimova_Malika_.*\.pdf$/.test(d.fname)) && docs.some((d) => /^\d\d-\d\d-\d{4}_Karimova_Malika\.zip$/.test(d.fname)), `PDF + ZIP with date names: ${docs.map((d) => d.fname).join(", ")}`);

  console.log("9) Exact score");
  a = await attemptOf(page);
  const r = a.result;
  // expected points for part 3/4 computed independently in Node with the teacher bank
  const tch = new Map(teacher.problems.map((p) => [p.id, p]));
  const { execSync } = await import("node:child_process");
  const calc = (pid, src) => {
    const p = tch.get(pid);
    writeFileSync(OUT + "tmp.fprg", src);
    writeFileSync(OUT + "tmp.json", JSON.stringify({ samples: p.samples, tests: p.tests.map((t, i) => ({ input: t.input, output: p._testOutputs[i] })) }));
    const out = execSync(`npx tsx ${ROOT}tests/judge-cli.ts ${OUT}tmp.fprg ${OUT}tmp.json`, { cwd: ROOT }).toString();
    return JSON.parse(out);
  };
  let exp3 = 0;
  for (const [pid, kind] of Object.entries(files)) {
    const meta = a.uploads[pid];
    const src = await page.evaluate(async (k) => {
      return await new Promise((res) => {
        const rq = indexedDB.open("fg-exam");
        rq.onsuccess = () => {
          const g = rq.result.transaction("kv").objectStore("kv").get(k);
          g.onsuccess = () => res(g.result);
        };
      });
    }, meta.key);
    const c = calc(Number(pid), src);
    const pts = Math.round(((3 * c.passed) / c.total) * 2) / 2;
    exp3 += pts;
    const got = r.problems.find((x) => x.problemId === Number(pid));
    check(got.verdict === (kind === "AC" ? "AC" : kind), `P${pid}: verdict ${got.verdict} (expected ${kind})`);
    check(got.passed === c.passed, `P${pid}: passed ${got.passed}/${got.total} = node ${c.passed}/${c.total}`);
  }
  const expTotal = exp1 + exp2 + exp3;
  check(r.total === expTotal, `total score ${r.total} == expected ${expTotal} (p1 ${exp1}, p2 ${exp2}, p3 ${exp3})`);
  check(r.bonus && r.bonus.score === 3, `bonus part judged separately: ${r.bonus?.score}/${r.bonus?.max}, not counted`);
  check(r.parts[3].counted === false && r.max === 25 + 30 + 60, `max excludes bonus: ${r.max}`);
  await page.waitForTimeout(1200);
  await shot(page, "05-results-1440-light");

  console.log("10) Reload on results → no duplicate delivery");
  const n0 = tg.length;
  await page.reload();
  await page.waitForSelector("text=Natija Telegramga yuborildi");
  await page.waitForTimeout(3000);
  check(tg.length === n0, `no duplicates after reload (${tg.length} == ${n0})`);

  console.log("11) PDF + ZIP downloads");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /PDF yuklab olish/ }).click()]);
  await dl.saveAs(OUT + "report.pdf");
  const [dz] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /ZIP yuklab olish/ }).click()]);
  await dz.saveAs(OUT + "files.zip");
  check(existsSync(OUT + "report.pdf"), "PDF downloaded: " + dl.suggestedFilename());
  check(existsSync(OUT + "files.zip"), "ZIP downloaded: " + dz.suggestedFilename());

  console.log("12) Screenshots (widths × themes)");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => localStorage.setItem("fg-exam:prefs", JSON.stringify({ theme: t, palette: "indigo" })), theme);
    for (const w of [1920, 1440, 820, 375]) {
      await page.setViewportSize({ width: w, height: w < 500 ? 812 : 1000 });
      await page.reload();
      await page.waitForSelector("text=Natijalar");
      await page.waitForTimeout(1300);
      await shot(page, `06-results-${w}-${theme}`);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(sw <= 0, `results: no horizontal scroll at ${w}px ${theme} (${sw})`);
    }
  }
  await ctx.close();

  console.log("13) Timer expiry → auto-submit; resume from entering page; exam screens in all widths");
  const t = await newPage();
  await t.page.goto(URL_);
  await t.page.getByPlaceholder("Karimova").fill("Test");
  await t.page.getByPlaceholder("Malika").fill("Talaba");
  await t.page.getByPlaceholder("8-A").fill("9-B");
  await t.page.getByRole("button", { name: /Imtihonni boshlash/ }).click();
  await t.page.getByRole("button", { name: /Boshlash/ }).click();
  await t.page.waitForSelector("text=1-qism");
  for (const theme of ["light", "dark"]) {
    await t.page.evaluate((th) => localStorage.setItem("fg-exam:prefs", JSON.stringify({ theme: th, palette: "indigo" })), theme);
    for (const w of [1920, 1440, 820, 375]) {
      await t.page.setViewportSize({ width: w, height: w < 500 ? 812 : 1000 });
      await t.page.reload();
      await t.page.waitForSelector('[aria-label="Qolgan vaqt"]');
      // find a question with a program for a richer screenshot
      await t.page.waitForTimeout(400);
      await shot(t.page, `07-exam-${w}-${theme}`);
      const sw = await t.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(sw <= 0, `exam: no horizontal scroll at ${w}px ${theme} (${sw})`);
    }
  }
  await t.page.setViewportSize({ width: 1440, height: 900 });
  await t.page.evaluate(() => sessionStorage.setItem("t:expire", "1"));
  await t.page.reload();
  await t.page.waitForTimeout(2500);
  await shot(t.page, "dbg-after-expire");
  console.log("   state:", JSON.stringify(await t.page.evaluate(() => { const a = JSON.parse(localStorage.getItem("fg-exam:attempt:v1")); return [a.phase, a.current, a.parts.map(p => p.status)]; })));
  await t.page.waitForSelector("text=Keyingi qism", { timeout: 10000 });
  const ta = await attemptOf(t.page);
  check(ta.parts[0].status === "submitted" && ta.parts[0].autoSubmitted && ta.current === 1, "part 1 auto-submitted when time ran out");
  // simulate the old bug: the current-attempt key is lost → entering page must offer «Davom ettirish»
  await t.page.evaluate(() => sessionStorage.setItem("t:dropkey", "1"));
  await t.page.reload();
  await t.page.waitForSelector("text=Tugallanmagan imtihon");
  await shot(t.page, "08-welcome-unfinished");
  await t.page.getByRole("button", { name: /Davom ettirish/ }).click();
  await t.page.waitForSelector("text=Keyingi qism");
  const tb = await attemptOf(t.page);
  check(tb.id === ta.id && JSON.stringify(tb.parts[1].items) === JSON.stringify(ta.parts[1].items), "resumed the same attempt with the same questions from the entering page");
  // a question with a flowchart (for screenshots)
  await t.page.getByRole("button", { name: /Boshlash/ }).click();
  const tc = await attemptOf(t.page);
  const withProg = tc.parts[1].items.findIndex((id) => qById.get(id).table);
  await t.page.locator("aside").getByRole("button", { name: new RegExp(`^${withProg + 1}-savol`) }).click();
  await t.page.waitForTimeout(400);
  await shot(t.page, "09-question-flowchart-1440");
  await t.page.setViewportSize({ width: 375, height: 812 });
  await t.page.waitForTimeout(300);
  await t.page.screenshot({ path: OUT + "09-question-flowchart-375.png", fullPage: true });
  await t.ctx.close();
} catch (e) {
  fails.push("exception: " + e.message);
  console.error(e);
} finally {
  await browser.close();
  srv.kill();
}

console.log(`\n${fails.length ? "FAILED" : "PASSED"} — ${fails.length} muammo`);
for (const f of fails) console.log(" -", f);
process.exit(fails.length ? 1 : 0);
