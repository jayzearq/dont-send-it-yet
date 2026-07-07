const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const riskyWords = [
  "miss",
  "please",
  "sorry",
  "hate",
  "love",
  "need",
  "alone",
  "drunk",
  "one more",
  "answer",
  "why",
  "closure",
];

const challengeTemplates = [
  {
    day: 0,
    subject: "Tonight, your only job is not reopening the wound",
    body:
      "You joined because one message felt bigger than you. For the next 24 hours, do not negotiate with the urge. Save the text, drink water, and let tomorrow-you inherit a quieter room.",
  },
  {
    day: 1,
    subject: "Day 1: this is withdrawal, not weakness",
    body:
      "Wanting contact does not mean contact will help. It means your body is reaching for a familiar regulator. Put one hand on your chest, name the urge, and let it pass without obeying it.",
  },
  {
    day: 3,
    subject: "Day 3: do not confuse intensity with truth",
    body:
      "Day 3 can feel dramatic. That does not make the message wise. If you need closure, write it in the vault. If you need comfort, give it to your body first.",
  },
  {
    day: 7,
    subject: "Day 7: you protected a whole week",
    body:
      "A week of no-contact is not silence. It is evidence. Look at what triggered you most often and protect that hour of the day.",
  },
  {
    day: 14,
    subject: "Day 14: loneliness is not a compatibility test",
    body:
      "Missing someone can be real without being an instruction. Today, do one thing that makes your life feel wider than the relationship.",
  },
  {
    day: 21,
    subject: "Day 21: the pattern is becoming visible",
    body:
      "The goal is not to become cold. It is to stop letting panic write your messages. Read your urge log and notice what your nervous system has been asking for.",
  },
  {
    day: 30,
    subject: "Day 30: you did not just avoid a text",
    body:
      "You practiced staying with yourself. Keep the vault, keep the boundary, and only reopen contact from steadiness, not from a spike.",
  },
];

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    writeDb({
      users: [],
      sessions: [],
      vault: [],
      challenges: [],
      checkins: [],
      feedback: [],
      outbox: [],
      events: [],
    });
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  return normalizeDb(db);
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function normalizeDb(db) {
  const defaults = {
    users: [],
    sessions: [],
    vault: [],
    challenges: [],
    checkins: [],
    feedback: [],
    outbox: [],
    events: [],
  };

  return { ...defaults, ...db };
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function text(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=3600",
  });
  res.end(body);
}

function getSiteUrl(req) {
  const configuredUrl = String(process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;

  const protocol = req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http");
  return `${protocol}://${req.headers.host}`.replace(/\/+$/, "");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}

function cleanEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calculateScore(text, urge, day) {
  const lower = text.toLowerCase();
  const matchedWords = riskyWords.filter((word) => lower.includes(word));
  const questionMarks = (text.match(/\?/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;
  const lengthPressure = text.length > 220 ? 12 : text.length > 100 ? 8 : 3;
  const urgeWeights = {
    comfort: 16,
    closure: 13,
    control: 22,
    revenge: 28,
    hope: 19,
  };
  const streakRisk = Number(day) > 0 && Number(day) < 7 ? 12 : Number(day) >= 7 ? 6 : 2;

  return Math.min(
    98,
    22 +
      matchedWords.length * 5 +
      questionMarks * 4 +
      exclamations * 3 +
      lengthPressure +
      (urgeWeights[urge] || 12) +
      streakRisk
  );
}

function getDiagnosis(score, urge) {
  if (score >= 80) {
    return "This text looks less like closure and more like a request for emotional relief. Do not send it while the urge is this loud.";
  }

  if (score >= 62) {
    return "This message may reopen the loop. Wait until you can name what you want without needing their response to regulate you.";
  }

  if (urge === "closure") {
    return "This might be about closure, but closure rarely arrives on command. Give the message a pause before it becomes another wound.";
  }

  return "The risk is lower, but a pause still protects you. Let the body settle before the message leaves your hands.";
}

function getRisks(text, score) {
  const risks = [];
  const lower = text.toLowerCase();

  if (lower.includes("miss") || lower.includes("love")) {
    risks.push("Reassurance risk: this may invite silence to hurt more than the breakup did.");
  }

  if (lower.includes("why") || lower.includes("answer")) {
    risks.push("Control risk: asking for an explanation may keep you hooked on their response.");
  }

  if (text.length > 220) {
    risks.push("Spiral risk: long messages often try to solve pain by overexplaining it.");
  }

  if (score > 75) {
    risks.push("No-contact risk: sending this could reset the streak your nervous system needs.");
  }

  if (!risks.length) {
    risks.push("Pause risk: the text may be fine, but the timing still deserves a little air.");
  }

  return risks;
}

function getNextAction(score) {
  if (score >= 80) {
    return "Start cooldown, then save the message to your vault. Do not send from this state.";
  }

  if (score >= 62) {
    return "Start cooldown. After it ends, choose whether the message is still true without needing a reply.";
  }

  return "Take the cooldown anyway. Low-risk texts can still be bad timing.";
}

function createEmailJob(db, email, day, subject, body, sendAt) {
  const existing = db.outbox.find((job) => job.email === email && job.day === day && job.kind === "challenge");
  if (existing) return existing;

  const job = {
    id: id("email"),
    kind: "challenge",
    email,
    day,
    subject,
    body,
    sendAt: sendAt.toISOString(),
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  db.outbox.push(job);
  return job;
}

function summarizeStats(db) {
  const events = db.events || [];
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((event) => new Date(event.createdAt).getTime() >= since);
  const counts = {};
  const daily = {};
  const sources = {};

  recentEvents.forEach((event) => {
    counts[event.type] = (counts[event.type] || 0) + 1;
    const day = String(event.createdAt || "").slice(0, 10);
    if (day) {
      daily[day] = daily[day] || {};
      daily[day][event.type] = (daily[day][event.type] || 0) + 1;
    }

    if (event.type === "page_view") {
      const source = event.source || "direct";
      sources[source] = (sources[source] || 0) + 1;
    }
  });

  const uniqueVisitors = new Set(
    recentEvents.filter((event) => event.visitorId).map((event) => event.visitorId)
  ).size;

  return {
    windowDays: 30,
    generatedAt: new Date().toISOString(),
    uniqueVisitors,
    counts,
    sources,
    daily,
  };
}

function requireAdmin(req, res) {
  const token = String(process.env.ADMIN_TOKEN || "").trim();
  const header = String(req.headers.authorization || "");

  if (!token) {
    json(res, 503, { error: "Admin input export is disabled. Set ADMIN_TOKEN to enable it." });
    return false;
  }

  if (header !== `Bearer ${token}`) {
    json(res, 401, { error: "Unauthorized." });
    return false;
  }

  return true;
}

function getAdminInputs(db) {
  return {
    generatedAt: new Date().toISOString(),
    sessions: (db.sessions || []).slice(-200).map((item) => ({
      id: item.id,
      email: item.email,
      draft: item.draft,
      urge: item.urge,
      streakDay: item.streakDay,
      score: item.score,
      status: item.status,
      reflection: item.reflection,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
    })),
    vault: (db.vault || []).slice(0, 200).map((item) => ({
      id: item.id,
      email: item.email,
      sessionId: item.sessionId,
      text: item.text,
      score: item.score,
      urge: item.urge,
      reflection: item.reflection,
      createdAt: item.createdAt,
    })),
    checkins: (db.checkins || []).slice(-200).map((item) => ({
      id: item.id,
      email: item.email,
      challengeId: item.challengeId,
      urgeLevel: item.urgeLevel,
      protectedToday: item.protectedToday,
      note: item.note,
      createdAt: item.createdAt,
    })),
    feedback: (db.feedback || []).slice(-200).map((item) => ({
      id: item.id,
      sessionId: item.sessionId,
      email: item.email,
      outcome: item.outcome,
      hardPart: item.hardPart,
      supportNeed: item.supportNeed,
      note: item.note,
      createdAt: item.createdAt,
    })),
  };
}

function scheduleChallenge(db, challenge) {
  const start = new Date(challenge.startDate);
  challengeTemplates.forEach((template) => {
    createEmailJob(
      db,
      challenge.email,
      template.day,
      template.subject,
      template.body,
      addDays(start, template.day)
    );
  });
}

async function deliverDueEmails(db) {
  const now = Date.now();
  const due = db.outbox.filter((job) => job.status === "queued" && new Date(job.sendAt).getTime() <= now);

  for (const job of due) {
    if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
      job.status = "mock_sent";
      job.sentAt = new Date().toISOString();
      job.note = "Set RESEND_API_KEY and FROM_EMAIL to send real email.";
      continue;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL,
          to: job.email,
          subject: job.subject,
          text: job.body,
        }),
      });

      job.status = response.ok ? "sent" : "failed";
      job.sentAt = new Date().toISOString();
      job.providerStatus = response.status;
      if (!response.ok) {
        job.error = await response.text();
      }
    } catch (error) {
      job.status = "failed";
      job.error = error.message;
      job.sentAt = new Date().toISOString();
    }
  }
}

function getOrCreateUser(db, email) {
  let user = db.users.find((item) => item.email === email);
  if (!user) {
    user = {
      id: id("user"),
      email,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    db.users.push(user);
  } else {
    user.lastSeenAt = new Date().toISOString();
  }
  return user;
}

async function handleApi(req, res, pathname) {
  const db = readDb();
  await deliverDueEmails(db);

  if (req.method === "POST" && pathname === "/api/score") {
    const body = await readBody(req);
    const draft = String(body.draft || "").trim();
    const email = cleanEmail(body.email);

    if (!draft) {
      return json(res, 400, { error: "Draft is required." });
    }

    if (email) getOrCreateUser(db, email);

    const score = calculateScore(draft, body.urge, body.streakDay);
    const session = {
      id: id("session"),
      email,
      draft,
      urge: body.urge || "comfort",
      streakDay: Number(body.streakDay || 0),
      score,
      risks: getRisks(draft, score),
      status: "scored",
      createdAt: new Date().toISOString(),
    };

    db.sessions.push(session);
    db.events.push({ type: "score_generated", sessionId: session.id, email, score, createdAt: session.createdAt });
    writeDb(db);

    return json(res, 200, {
      sessionId: session.id,
      score,
      diagnosis: getDiagnosis(score, session.urge),
      risks: session.risks,
      nextAction: getNextAction(score),
    });
  }

  if (req.method === "POST" && pathname === "/api/cooldown") {
    const body = await readBody(req);
    const session = db.sessions.find((item) => item.id === body.sessionId);

    if (!session) {
      return json(res, 404, { error: "Session not found." });
    }

    session.status = "cooling";
    session.cooldownStartedAt = new Date().toISOString();
    session.cooldownSeconds = Number(body.durationSeconds || 600);
    db.events.push({
      type: "cooldown_started",
      sessionId: session.id,
      email: session.email,
      createdAt: session.cooldownStartedAt,
    });
    writeDb(db);

    return json(res, 200, { ok: true, session });
  }

  if (req.method === "POST" && pathname === "/api/decision") {
    const body = await readBody(req);
    const session = db.sessions.find((item) => item.id === body.sessionId);

    if (!session) {
      return json(res, 404, { error: "Session not found." });
    }

    const decision = String(body.decision || "vault");
    session.status = decision;
    session.completedAt = new Date().toISOString();
    session.reflection = String(body.reflection || "").trim();

    let vaultItem = null;
    if (decision === "vault") {
      vaultItem = {
        id: id("vault"),
        email: session.email,
        sessionId: session.id,
        text: session.draft,
        score: session.score,
        urge: session.urge,
        reflection: session.reflection,
        createdAt: session.completedAt,
      };
      db.vault.unshift(vaultItem);
    }

    db.events.push({
      type: `decision_${decision}`,
      sessionId: session.id,
      email: session.email,
      createdAt: session.completedAt,
    });
    writeDb(db);

    return json(res, 200, {
      ok: true,
      decision,
      vaultItem,
      message:
        decision === "vault"
          ? "Saved. The message has somewhere to go that is not their phone."
          : decision === "delete"
            ? "Deleted. The urge can end without becoming a notification."
            : "Recorded. If you send, send from steadiness and log how it feels after.",
    });
  }

  if (req.method === "POST" && pathname === "/api/challenge") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);

    if (!email || !email.includes("@")) {
      return json(res, 400, { error: "Valid email is required." });
    }

    getOrCreateUser(db, email);
    let challenge = db.challenges.find((item) => item.email === email && item.status === "active");

    if (!challenge) {
      challenge = {
        id: id("challenge"),
        email,
        status: "active",
        startDate: new Date().toISOString(),
        currentDay: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
      };
      db.challenges.push(challenge);
    }

    scheduleChallenge(db, challenge);
    await deliverDueEmails(db);
    writeDb(db);

    return json(res, 200, {
      ok: true,
      challenge,
      emails: db.outbox.filter((job) => job.email === email && job.kind === "challenge"),
    });
  }

  if (req.method === "POST" && pathname === "/api/checkin") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const challenge = db.challenges.find((item) => item.email === email && item.status === "active");

    if (!challenge) {
      return json(res, 404, { error: "Active challenge not found." });
    }

    const protectedToday = Boolean(body.protectedToday);
    challenge.streak = protectedToday ? challenge.streak + 1 : 0;
    challenge.currentDay = Math.floor((Date.now() - new Date(challenge.startDate).getTime()) / 86_400_000);
    challenge.lastCheckinAt = new Date().toISOString();

    const checkin = {
      id: id("checkin"),
      email,
      challengeId: challenge.id,
      urgeLevel: Number(body.urgeLevel || 0),
      protectedToday,
      note: String(body.note || "").trim(),
      createdAt: challenge.lastCheckinAt,
    };
    db.checkins.push(checkin);

    if (checkin.urgeLevel >= 8) {
      createEmailJob(
        db,
        email,
        -1,
        "Emergency pause: wait ten minutes",
        "Your urge is loud, so the instruction is small: do not send anything for ten minutes. Put the text in the vault, stand up, and let the first wave pass.",
        new Date()
      );
      await deliverDueEmails(db);
    }

    writeDb(db);
    return json(res, 200, { ok: true, challenge, checkin });
  }

  if (req.method === "POST" && pathname === "/api/feedback") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const item = {
      id: id("feedback"),
      sessionId: String(body.sessionId || ""),
      email,
      outcome: String(body.outcome || ""),
      hardPart: String(body.hardPart || ""),
      supportNeed: String(body.supportNeed || ""),
      note: String(body.note || "").trim(),
      createdAt: new Date().toISOString(),
    };

    db.feedback.push(item);
    db.events.push({
      type: "feedback_submitted",
      sessionId: item.sessionId,
      email,
      outcome: item.outcome,
      hardPart: item.hardPart,
      createdAt: item.createdAt,
    });
    writeDb(db);

    return json(res, 200, {
      ok: true,
      feedback: item,
      message: "Thank you. This helps make the pause better for the next person in the same moment.",
    });
  }

  if (req.method === "POST" && pathname === "/api/event") {
    const body = await readBody(req);
    const type = String(body.type || "").trim();
    const allowed = new Set([
      "page_view",
      "hero_cta_clicked",
      "challenge_cta_clicked",
      "feedback_opened",
      "sound_selected",
    ]);

    if (!allowed.has(type)) {
      return json(res, 400, { error: "Unsupported event type." });
    }

    const event = {
      type,
      visitorId: String(body.visitorId || "").slice(0, 80),
      source: String(body.source || "direct").slice(0, 80),
      medium: String(body.medium || "").slice(0, 80),
      campaign: String(body.campaign || "").slice(0, 80),
      path: String(body.path || "/").slice(0, 200),
      createdAt: new Date().toISOString(),
    };
    db.events.push(event);
    writeDb(db);

    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/state") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const email = cleanEmail(url.searchParams.get("email"));
    return json(res, 200, {
      user: db.users.find((item) => item.email === email) || null,
      challenge: db.challenges.find((item) => item.email === email && item.status === "active") || null,
      vault: db.vault.filter((item) => !email || item.email === email).slice(0, 12),
      outbox: db.outbox.filter((item) => !email || item.email === email).slice(-12),
      checkins: db.checkins.filter((item) => !email || item.email === email).slice(-12),
      feedback: db.feedback.filter((item) => !email || item.email === email).slice(-12),
    });
  }

  if (req.method === "GET" && pathname === "/api/outbox") {
    writeDb(db);
    return json(res, 200, { outbox: db.outbox.slice(-50) });
  }

  if (req.method === "GET" && pathname === "/api/stats") {
    return json(res, 200, summarizeStats(db));
  }

  if (req.method === "GET" && pathname === "/api/admin/inputs") {
    if (!requireAdmin(req, res)) return;
    return json(res, 200, getAdminInputs(db));
  }

  writeDb(db);
  return json(res, 404, { error: "Not found." });
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const extname = path.extname(filePath);
    const body = extname === ".html" ? content.toString("utf8").replaceAll("{{SITE_URL}}", getSiteUrl(req)) : content;

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extname] || "application/octet-stream",
    });
    res.end(body);
  });
}

function redirect(res, location) {
  res.writeHead(301, { Location: location });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/healthz") {
      json(res, 200, { ok: true, service: "dont-send-it-yet" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/robots.txt") {
      const siteUrl = getSiteUrl(req);
      text(res, 200, `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
      return;
    }

    if (req.method === "GET" && url.pathname === "/sitemap.xml") {
      const siteUrl = getSiteUrl(req);
      const pages = [
        { path: "/", priority: "1.0" },
        { path: "/should-i-text-my-ex/", priority: "0.8" },
        { path: "/no-contact-challenge/", priority: "0.8" },
        { path: "/unsent-texts/", priority: "0.8" },
        { path: "/drunk-texting-ex/", priority: "0.7" },
        { path: "/closure-text-to-ex/", priority: "0.7" },
        { path: "/text-ex-at-night/", priority: "0.7" },
        { path: "/breakup-urge-timer/", priority: "0.7" },
      ];
      const urls = pages
        .map(
          (page) =>
            `  <url>\n    <loc>${siteUrl}${page.path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
        )
        .join("\n");
      text(
        res,
        200,
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        "application/xml; charset=utf-8"
      );
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }

    const trailingSlashRoutes = new Set([
      "/should-i-text-my-ex",
      "/no-contact-challenge",
      "/unsent-texts",
      "/drunk-texting-ex",
      "/closure-text-to-ex",
      "/text-ex-at-night",
      "/breakup-urge-timer",
    ]);
    if (trailingSlashRoutes.has(url.pathname)) {
      redirect(res, `${url.pathname}/${url.search}`);
      return;
    }

    serveStatic(req, res, url.pathname);
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

ensureDb();
setInterval(async () => {
  const db = readDb();
  await deliverDueEmails(db);
  writeDb(db);
}, 60_000).unref();

server.listen(PORT, () => {
  console.log(`Don't Send It Yet is running at http://localhost:${PORT}`);
});
