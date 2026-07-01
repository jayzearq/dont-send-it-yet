const form = document.querySelector("#textForm");
const draftText = document.querySelector("#draftText");
const urgeType = document.querySelector("#urgeType");
const streakDay = document.querySelector("#streakDay");
const userEmail = document.querySelector("#userEmail");
const scoreValue = document.querySelector("#scoreValue");
const meterRing = document.querySelector("#meterRing");
const diagnosis = document.querySelector("#diagnosis");
const riskList = document.querySelector("#riskList");
const nextAction = document.querySelector("#nextAction");
const startCooldown = document.querySelector("#startCooldown");
const cooldownPanel = document.querySelector("#cooldownPanel");
const timer = document.querySelector("#timer");
const cooldownPrompt = document.querySelector("#cooldownPrompt");
const reflectionText = document.querySelector("#reflectionText");
const nextPrompt = document.querySelector("#nextPrompt");
const finishCooldown = document.querySelector("#finishCooldown");
const soundChips = document.querySelectorAll(".sound-chip");
const soundVolume = document.querySelector("#soundVolume");
const decisionPanel = document.querySelector("#decisionPanel");
const saveVault = document.querySelector("#saveVault");
const deleteDraft = document.querySelector("#deleteDraft");
const recordSent = document.querySelector("#recordSent");
const decisionNote = document.querySelector("#decisionNote");
const feedbackForm = document.querySelector("#feedbackForm");
const feedbackModal = document.querySelector("#feedbackModal");
const openFeedback = document.querySelector("#openFeedback");
const closeFeedback = document.querySelector("#closeFeedback");
const feedbackEmail = document.querySelector("#feedbackEmail");
const feedbackNote = document.querySelector("#feedbackNote");
const feedbackStatus = document.querySelector("#feedbackStatus");
const vaultCount = document.querySelector("#vaultCount");
const vaultList = document.querySelector("#vaultList");
const emailForm = document.querySelector("#emailForm");
const emailStatus = document.querySelector("#emailStatus");
const emailInput = document.querySelector("#email");
const checkinForm = document.querySelector("#checkinForm");
const checkinEmail = document.querySelector("#checkinEmail");
const urgeLevel = document.querySelector("#urgeLevel");
const urgeReadout = document.querySelector("#urgeReadout");
const checkinNote = document.querySelector("#checkinNote");
const protectedToday = document.querySelector("#protectedToday");
const checkinStatus = document.querySelector("#checkinStatus");
const emailTimeline = document.querySelector("#emailTimeline");

const prompts = [
  "What are you hoping they will say back?",
  "What will you feel if they do not reply?",
  "Is this text asking for connection, closure, control, or comfort?",
  "What would tomorrow-you want protected right now?",
];

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

let currentScore = 0;
let currentSessionId = "";
let intervalId = null;
let remainingSeconds = 600;
let promptIndex = 0;
let audioContext = null;
let soundNodes = [];
let masterGain = null;
let currentSound = "off";

function getLocal(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function api(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(error.error || "Request failed.");
  }

  return response.json();
}

async function getState(email = "") {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  const response = await fetch(`/api/state${query}`);
  if (!response.ok) throw new Error("State unavailable.");
  return response.json();
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
    22 + matchedWords.length * 5 + questionMarks * 4 + exclamations * 3 + lengthPressure + urgeWeights[urge] + streakRisk
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

function fallbackScore(text, urge, day) {
  const score = calculateScore(text, urge, day);
  return {
    sessionId: `local_${Date.now()}`,
    score,
    diagnosis: getDiagnosis(score, urge),
    risks: getRisks(text, score),
    nextAction:
      score >= 80
        ? "Start cooldown, then save the message to your vault. Do not send from this state."
        : "Start cooldown. Let your body settle before the message leaves your hands.",
  };
}

function renderResult(result) {
  currentScore = result.score;
  currentSessionId = result.sessionId;
  scoreValue.textContent = result.score;
  meterRing.style.setProperty("--score", result.score);
  diagnosis.textContent = result.diagnosis;
  nextAction.textContent = result.nextAction;
  riskList.innerHTML = result.risks.map((risk) => `<div class="risk-pill">${escapeHtml(risk)}</div>`).join("");
  startCooldown.disabled = false;
  decisionPanel.hidden = true;
  decisionNote.textContent = "";
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

async function startTimer() {
  clearInterval(intervalId);
  remainingSeconds = 600;
  timer.textContent = formatTime(remainingSeconds);
  cooldownPanel.hidden = false;
  decisionPanel.hidden = true;
  startCooldown.disabled = true;

  if (currentSessionId && !currentSessionId.startsWith("local_")) {
    await api("/api/cooldown", { sessionId: currentSessionId, durationSeconds: 600 }).catch(() => null);
  }

  intervalId = setInterval(() => {
    remainingSeconds -= 1;
    timer.textContent = formatTime(remainingSeconds);

    if (remainingSeconds <= 0) {
      completeCooldown();
    }
  }, 1000);
}

function completeCooldown() {
  clearInterval(intervalId);
  stopSound();
  timer.textContent = "00:00";
  cooldownPrompt.textContent = "The urge had time to cool. Now choose where the message goes.";
  decisionPanel.hidden = false;
  startCooldown.disabled = false;
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(soundVolume.value) / 100;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function stopSound() {
  soundNodes.forEach((node) => {
    try {
      if (typeof node.stop === "function") node.stop();
      if (typeof node.disconnect === "function") node.disconnect();
    } catch {
      // Nodes may already be stopped.
    }
  });
  soundNodes = [];
}

function setActiveSound(sound) {
  currentSound = sound;
  soundChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.sound === sound);
  });
}

function playSound(sound) {
  stopSound();
  setActiveSound(sound);

  if (sound === "off") return;

  ensureAudio();

  if (sound === "rain") {
    playRain();
  }

  if (sound === "brown") {
    playBrownNoise();
  }

  if (sound === "breathing") {
    playBreathingTone();
  }
}

function createNoiseBuffer(type) {
  const seconds = 3;
  const length = audioContext.sampleRate * seconds;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (type === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white * 0.42;
    }
  }

  return buffer;
}

function playRain() {
  const source = audioContext.createBufferSource();
  source.buffer = createNoiseBuffer("white");
  source.loop = true;

  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 900;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 5200;

  const gain = audioContext.createGain();
  gain.gain.value = 0.52;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(masterGain);
  source.start();
  soundNodes.push(source, highpass, lowpass, gain);
}

function playBrownNoise() {
  const source = audioContext.createBufferSource();
  source.buffer = createNoiseBuffer("brown");
  source.loop = true;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 820;

  const gain = audioContext.createGain();
  gain.gain.value = 0.65;

  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(masterGain);
  source.start();
  soundNodes.push(source, lowpass, gain);
}

function playBreathingTone() {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 196;
  gain.gain.value = 0.04;

  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.035;

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  oscillator.connect(gain);
  gain.connect(masterGain);

  oscillator.start();
  lfo.start();
  soundNodes.push(oscillator, gain, lfo, lfoGain);
}

async function recordDecision(decision) {
  const draft = draftText.value.trim();
  const reflection = reflectionText.value.trim();
  let result = null;

  if (currentSessionId && !currentSessionId.startsWith("local_")) {
    result = await api("/api/decision", {
      sessionId: currentSessionId,
      decision,
      reflection,
    }).catch((error) => ({ message: error.message }));
  }

  if (!result || result.message?.includes("failed")) {
    const items = getLocal("dontSendVault", []);
    if (decision === "vault" && draft) {
      items.unshift({
        id: `local_${Date.now()}`,
        text: draft,
        score: currentScore,
        reflection,
        createdAt: new Date().toISOString(),
      });
      setLocal("dontSendVault", items.slice(0, 12));
    }
    result = {
      message:
        decision === "vault"
          ? "Saved locally. The message has somewhere to go that is not their phone."
          : decision === "delete"
            ? "Deleted locally. The urge can end without becoming a notification."
            : "Recorded locally. Notice how it feels after sending.",
    };
  }

  decisionNote.textContent = result.message;

  if (decision === "delete") {
    draftText.value = "";
  }

  if (decision === "vault" || decision === "delete") {
    resetScoreAfterDecision();
  }

  await refreshState();
}

async function saveFeedback(event) {
  event.preventDefault();
  const payload = {
    sessionId: currentSessionId,
    email: feedbackEmail.value.trim() || userEmail.value.trim(),
    outcome: "general",
    hardPart: "unspecified",
    supportNeed: "unspecified",
    note: feedbackNote.value.trim(),
  };

  try {
    const result = await api("/api/feedback", payload);
    feedbackStatus.textContent = result.message;
  } catch {
    const items = getLocal("dontSendFeedback", []);
    items.push({ ...payload, createdAt: new Date().toISOString() });
    setLocal("dontSendFeedback", items);
    feedbackStatus.textContent = "Saved locally. Thank you for helping shape this.";
  }

  feedbackForm.reset();
}

function showFeedbackModal() {
  feedbackModal.hidden = false;
  feedbackEmail.value = userEmail.value || emailInput.value || "";
  feedbackNote.focus();
}

function hideFeedbackModal() {
  feedbackModal.hidden = true;
  feedbackStatus.textContent = "";
}

function resetScoreAfterDecision() {
  scoreValue.textContent = "--";
  meterRing.style.setProperty("--score", 0);
  riskList.innerHTML = "";
  nextAction.textContent = "You completed the loop. Start again only if another urge shows up.";
  startCooldown.disabled = true;
}

async function refreshState(email = userEmail.value || emailInput.value || checkinEmail.value || "") {
  try {
    const state = await getState(email);
    renderVault(state.vault || []);
    renderEmails(state.outbox || []);
    renderChallenge(state.challenge);
  } catch {
    renderVault(getLocal("dontSendVault", []));
  }
}

function renderChallenge(challenge) {
  if (!challenge) return;
  streakDay.value = challenge.streak || challenge.currentDay || 0;
}

function renderVault(items) {
  vaultCount.textContent = items.length;

  if (!items.length) {
    vaultList.innerHTML = '<p class="empty-state">Saved drafts will appear here.</p>';
    return;
  }

  vaultList.innerHTML = items
    .map((item) => {
      const date = new Date(item.createdAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const reflection = item.reflection ? `<p class="vault-reflection">${escapeHtml(item.reflection)}</p>` : "";
      return `<article class="vault-item"><time>${date} · score ${item.score}</time><p>${escapeHtml(item.text)}</p>${reflection}</article>`;
    })
    .join("");
}

function renderEmails(items) {
  if (!items.length) {
    emailTimeline.innerHTML = '<p class="empty-state">Start the challenge to see scheduled emails.</p>';
    return;
  }

  emailTimeline.innerHTML = items
    .map((item) => {
      const date = new Date(item.sendAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
        <article class="email-step">
          <span class="email-status">${escapeHtml(item.status.replace("_", " "))}</span>
          <strong>Day ${item.day < 0 ? "SOS" : item.day}: ${escapeHtml(item.subject)}</strong>
          <time>${date}</time>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = draftText.value.trim();

  if (!text) return;

  const payload = {
    draft: text,
    urge: urgeType.value,
    streakDay: streakDay.value,
    email: userEmail.value.trim(),
  };

  const result = await api("/api/score", payload).catch(() =>
    fallbackScore(payload.draft, payload.urge, payload.streakDay)
  );
  renderResult(result);
});

startCooldown.addEventListener("click", startTimer);

finishCooldown.addEventListener("click", completeCooldown);

nextPrompt.addEventListener("click", () => {
  promptIndex = (promptIndex + 1) % prompts.length;
  cooldownPrompt.textContent = prompts[promptIndex];
});

saveVault.addEventListener("click", () => recordDecision("vault"));

deleteDraft.addEventListener("click", () => recordDecision("delete"));

recordSent.addEventListener("click", () => recordDecision("sent"));

feedbackForm.addEventListener("submit", saveFeedback);

openFeedback.addEventListener("click", showFeedbackModal);
closeFeedback.addEventListener("click", hideFeedbackModal);
feedbackModal.addEventListener("click", (event) => {
  if (event.target === feedbackModal) {
    hideFeedbackModal();
  }
});

soundChips.forEach((chip) => {
  chip.addEventListener("click", () => playSound(chip.dataset.sound));
});

soundVolume.addEventListener("input", () => {
  if (masterGain) {
    masterGain.gain.value = Number(soundVolume.value) / 100;
  }
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  userEmail.value = email;
  checkinEmail.value = email;

  try {
    const result = await api("/api/challenge", { email });
    emailStatus.textContent =
      result.emails?.[0]?.status === "mock_sent"
        ? "Challenge started. Day 0 email is in the local outbox."
        : "Challenge started. Your reset sequence is scheduled.";
    renderEmails(result.emails || []);
    renderChallenge(result.challenge);
  } catch (error) {
    const waitlist = getLocal("dontSendWaitlist", []);
    waitlist.push({ email, createdAt: new Date().toISOString() });
    setLocal("dontSendWaitlist", waitlist);
    emailStatus.textContent = "Saved locally. Connect the server to send real emails.";
  }
});

urgeLevel.addEventListener("input", () => {
  urgeReadout.textContent = `${urgeLevel.value} / 10`;
});

checkinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = checkinEmail.value.trim();
  userEmail.value = email;
  emailInput.value = email;

  try {
    const result = await api("/api/checkin", {
      email,
      urgeLevel: urgeLevel.value,
      note: checkinNote.value,
      protectedToday: protectedToday.checked,
    });
    checkinStatus.textContent = protectedToday.checked
      ? `Saved. Your streak is now ${result.challenge.streak}.`
      : "Saved. The streak reset, but the loop is still honest.";
    renderChallenge(result.challenge);
    await refreshState(email);
  } catch (error) {
    checkinStatus.textContent = "Start the 30-day reset emails first.";
  }
});

refreshState();
