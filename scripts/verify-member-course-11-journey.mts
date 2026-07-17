import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";

const baseUrl = (process.env.TEST_BASE_URL || "http://127.0.0.1:3101").replace(/\/$/, "");
const webhookSecret = process.env.TEST_PAYMENT_WEBHOOK_SECRET || "local-journey-test-secret";
const dbPath = process.env.TEST_DB_PATH;
if (!dbPath) throw new Error("TEST_DB_PATH is required for isolated journey cleanup.");

const email = `codex-course11-${Date.now()}@example.invalid`;
const transactionId = `codex-course11-${randomUUID()}`;
const activationToken = `codex-activate-${randomUUID()}`;
const activationHash = createHash("sha256").update(activationToken).digest("hex");
let memberId: number | null = null;
let db: Database.Database | null = null;
let seededCourseFixture = false;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function responseJson(response: Response) {
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { response, data };
}

function cookieFrom(response: Response) {
  const raw = response.headers.get("set-cookie") || "";
  const cookie = raw.split(";")[0];
  assert(cookie.includes("="), "Activation response did not establish a session cookie.");
  return cookie;
}

function cleanup() {
  if (!db) return;
  if (memberId) {
  const tables = [
    "member_account_activations",
    "member_payment_events",
    "member_progress",
    "member_course_access",
    "member_product_entitlements",
    "member_commerce_orders",
    "member_manuscript_access",
    "member_circle_memberships",
    "member_daily_reflections",
    "journal_entries",
    "community_posts",
    "event_rsvps",
    "members",
  ];
  const transaction = db.transaction(() => {
    for (const table of tables) {
      try { db!.prepare(`DELETE FROM ${table} WHERE member_id = ?`).run(memberId); } catch { /* table may not exist in an older isolated schema */ }
    }
    try { db!.prepare("DELETE FROM members WHERE id = ?").run(memberId); } catch { /* nothing else to remove */ }
  });
  transaction();
  }
  if (seededCourseFixture) {
    db.prepare("DELETE FROM courses WHERE id = 11").run();
  }
}

function ensureCourse11Fixture() {
  assert(db, "Database is unavailable.");
  const existing = db.prepare("SELECT id FROM courses WHERE id = 11").get();
  if (existing) return;
  const seed = db.transaction(() => {
    db!.prepare("INSERT INTO courses (id, title, description, pillar, sort_order) VALUES (11, ?, ?, ?, 11)")
      .run("Course 11", "Disposable isolated-test fixture for the $4.99 membership journey.", "General");
    const insertLesson = db!.prepare("INSERT INTO lessons (id, course_id, title, description, content_url, content_type, sort_order, duration_minutes) VALUES (?, 11, ?, ?, ?, 'audio', ?, 10)");
    for (let order = 1; order <= 12; order += 1) {
      insertLesson.run(74 + order, `Course 11 — Lesson ${order}`, "Disposable isolated-test lesson.", `https://example.invalid/course-11-${order}.mp3`, order);
    }
  });
  seed();
  seededCourseFixture = true;
}

async function run() {
  db = new Database(dbPath);
  try {
    ensureCourse11Fixture();
    const paid = await responseJson(await fetch(`${baseUrl}/api/webhooks/member-paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify({
        provider: "codex-journey-test",
        transaction_id: transactionId,
        customer_email: email,
        customer_details: { email, name: "Codex Journey Test" },
        amount_total: 499,
      }),
    }));
    assert(paid.response.ok && paid.data?.ok, `Paid webhook failed: ${JSON.stringify(paid.data)}`);
    assert(paid.data.account_created === true, "Paid webhook did not create a new customer account.");
    assert(paid.data.payment_status === "paid", "Paid webhook did not activate the membership.");
    assert(paid.data.course_access?.course_id === 11 && paid.data.course_access?.granted === true, "Paid webhook did not grant Course 11.");
    assert(paid.data.activation_delivery?.requested === true, "Paid webhook did not request account activation delivery.");
    memberId = Number(paid.data.member_id);
    assert(Number.isInteger(memberId) && memberId > 0, "Paid webhook did not return a valid member ID.");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE member_account_activations SET used_at = datetime('now') WHERE member_id = ? AND purpose = 'set_password' AND used_at IS NULL").run(memberId);
    db.prepare("INSERT INTO member_account_activations (member_id, token_hash, purpose, expires_at) VALUES (?, ?, 'set_password', ?)")
      .run(memberId, activationHash, expiresAt);

    const activationCheck = await responseJson(await fetch(`${baseUrl}/api/member/auth/activate?token=${encodeURIComponent(activationToken)}`));
    assert(activationCheck.response.ok && activationCheck.data?.ok, `Activation link validation failed: ${JSON.stringify(activationCheck.data)}`);
    assert(activationCheck.data.email === email, "Activation link was not bound to the paid customer account.");

    const activation = await responseJson(await fetch(`${baseUrl}/api/member/auth/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: activationToken, password: "Journey-Test-Password-2026", confirm_password: "Journey-Test-Password-2026" }),
    }));
    assert(activation.response.ok && activation.data?.ok, `Password activation failed: ${JSON.stringify(activation.data)}`);
    const cookie = cookieFrom(activation.response);

    const courses = await responseJson(await fetch(`${baseUrl}/api/member/courses`, { headers: { Cookie: cookie } }));
    assert(courses.response.ok && Array.isArray(courses.data), `Course list failed: ${JSON.stringify(courses.data)}`);
    assert(courses.data.some((course: any) => Number(course.id) === 11), "Active paid member cannot see Course 11.");

    const course = await responseJson(await fetch(`${baseUrl}/api/member/courses/11`, { headers: { Cookie: cookie } }));
    assert(course.response.ok && Array.isArray(course.data?.lessons), `Course 11 retrieval failed: ${JSON.stringify(course.data)}`);
    assert(course.data.lessons.length === 12, `Course 11 should expose 12 lessons, found ${course.data.lessons.length}.`);
    assert(course.data.lessons.every((lesson: any) => lesson.entitled === true && lesson.locked === false), "A paid member has locked Course 11 lessons.");

    const protectedLesson = course.data.lessons.find((lesson: any) => String(lesson.content_url || "").startsWith("/api/member/audio/"));
    assert(protectedLesson, `Course 11 did not expose any protected buyer-only audio URL for playback validation: ${JSON.stringify(course.data.lessons.map((lesson: any) => ({ id: lesson.id, sort_order: lesson.sort_order, content_url: lesson.content_url, entitled: lesson.entitled, locked: lesson.locked })))}`);
    const audio = await fetch(`${baseUrl}${protectedLesson.content_url}`, { headers: { Cookie: cookie } });
    const audioBytes = (await audio.arrayBuffer()).byteLength;
    assert(audio.ok, `Protected Course 11 audio playback failed with HTTP ${audio.status}.`);
    assert((audio.headers.get("content-type") || "").includes("audio/mpeg"), "Protected audio did not return audio/mpeg content.");
    assert(audioBytes > 1024, `Protected audio response was unexpectedly small (${audioBytes} bytes).`);

    const progress = await responseJson(await fetch(`${baseUrl}/api/member/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ lesson_id: protectedLesson.id }),
    }));
    assert(progress.response.ok && progress.data?.ok, `Lesson progress submission failed: ${JSON.stringify(progress.data)}`);

    const duplicate = await responseJson(await fetch(`${baseUrl}/api/webhooks/member-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${webhookSecret}` },
      body: JSON.stringify({ provider: "codex-journey-test", transaction_id: transactionId, customer_email: email, amount_total: 499 }),
    }));
    assert(duplicate.response.ok && duplicate.data?.duplicate === true, `Duplicate payment event was not idempotent: ${JSON.stringify(duplicate.data)}`);
    const events = db.prepare("SELECT COUNT(*) AS count FROM member_payment_events WHERE provider = ? AND transaction_id = ?").get("codex-journey-test", transactionId) as { count: number };
    assert(events.count === 1, `Expected one stored payment event, found ${events.count}.`);

    console.log(JSON.stringify({
      ok: true,
      checkpoints: [
        "payment accepted at $4.99 base price",
        "account created",
        "activation/login route verified",
        "Course 11 visible",
        "12 Course 11 lessons entitled",
        "protected audio playback verified",
        "lesson progress verified",
        "duplicate payment event rejected idempotently",
        "disposable Course 11 fixture used because the repository local database has no seeded course records",
      ],
      email_delivery: "activation delivery was requested; external provider delivery is deliberately disabled in the isolated test",
    }, null, 2));
  } finally {
    cleanup();
    db?.close();
  }
}

run().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
