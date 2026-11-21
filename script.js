"use strict";

// Google Apps Script web app URL. Paste the deployed /exec URL here.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIOXTn6BMidSpovzQyY2vtqtyYjajc4kv2My1hH0MYYSF2g5tIRuqnoQ0lAsDYYn5LWA/exec";
const EXTRA_FLAME_FRAMES = ["images/flame-2.png", "images/flame-3.png"];

const signUp = document.querySelector(".painting-link");
const cardDialog = document.querySelector("#card-dialog");

signUp.addEventListener("click", () => cardDialog.showModal());
cardDialog.querySelector(".dialog-close").addEventListener("click", () => cardDialog.close());

const form = cardDialog.querySelector("#postal-form");
const fields = [
  [form.elements.name, "Please enter your name(s)."],
  [form.elements.full_address, "Please enter your full postal address."],
];
const button = form.querySelector(".postal-submit");
const status = form.querySelector(".submit-status");
const thanks = cardDialog.querySelector(".thanks");

function validateField(input, requiredMessage) {
  const valid = Boolean(input.value.trim());
  document.getElementById(input.id + "-error").textContent = valid ? "" : requiredMessage;
  if (valid) input.removeAttribute("aria-invalid");
  else input.setAttribute("aria-invalid", "true");
  return valid;
}

for (const [input, requiredMessage] of fields) {
  input.addEventListener("input", () => {
    if (input.hasAttribute("aria-invalid")) validateField(input, requiredMessage);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (button.disabled || form.hidden) return;

  const data = new FormData(form);
  if (data.get("website")) return;

  status.textContent = "";
  const invalidFields = fields.filter(([input, message]) => !validateField(input, message));
  if (invalidFields.length) {
    invalidFields[0][0].focus();
    return;
  }

  if (!APPS_SCRIPT_URL) {
    status.textContent = "Sign-ups aren’t open yet. Please check back soon.";
    return;
  }

  button.disabled = true;
  form.setAttribute("aria-busy", "true");
  status.textContent = "Sending your request…";

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: data,
      credentials: "omit",
    });
    if (response.type !== "opaque" && !response.ok) throw new Error("Request failed");
    form.reset();
    form.hidden = true;
    thanks.hidden = false;
    if (cardDialog.open) thanks.focus();
  } catch {
    status.textContent = "We couldn’t send your request. Please try again.";
  } finally {
    form.removeAttribute("aria-busy");
    button.disabled = false;
    if (form.hidden) status.textContent = "";
  }
});

const snowToggle = document.querySelector(".snow-toggle");
const snowfall = document.querySelector("#snowfall");

function setSnowfall(active) {
  snowToggle.setAttribute("aria-pressed", String(active));
  snowfall.hidden = !active;

  if (!active) {
    snowfall.replaceChildren();
    return;
  }

  const flakes = document.createDocumentFragment();
  const count = 34;
  for (let index = 0; index < count; index++) {
    const flake = document.createElement("span");
    const fallTime = 12 + Math.random() * 12;
    flake.className = "snowflake";
    flake.style.setProperty("--flake-left", `${((index + Math.random()) / count) * 100}%`);
    flake.style.setProperty("--rest-top", `${5 + Math.random() * 90}%`);
    flake.style.setProperty("--flake-size", `${7 + Math.random() * 11}px`);
    flake.style.setProperty("--flake-opacity", `${.4 + Math.random() * .5}`);
    flake.style.setProperty("--flake-drift", `${Math.random() * 100 - 50}px`);
    flake.style.setProperty("--flake-turn", `${Math.random() * 160 - 80}deg`);
    flake.style.setProperty("--fall-time", `${fallTime}s`);
    flake.style.setProperty("--fall-delay", `${-Math.random() * fallTime}s`);
    flakes.append(flake);
  }
  snowfall.append(flakes);
}

const motion = window.DeviceMotionEvent;
const requiresMotionPermission = typeof motion?.requestPermission === "function";
let requestedMotionPermission = false;
let gravityEstimate;
let aboveShakeThreshold = false;
let lastShakePeak = -Infinity;

function accelerationVector(reading) {
  const axes = [reading?.x, reading?.y, reading?.z];
  return axes.every(Number.isFinite) ? axes : null;
}

function shakeStrength(event) {
  const linear = accelerationVector(event.acceleration);
  if (linear) return Math.hypot(...linear);

  const raw = accelerationVector(event.accelerationIncludingGravity);
  if (!raw) return 0;

  // Track slow changes in gravity to keep quick shakes detectable in any direction.
  gravityEstimate ??= raw;
  const delta = raw.map((value, axis) => value - gravityEstimate[axis]);
  gravityEstimate = gravityEstimate.map((value, axis) => value + delta[axis] * .15);
  return Math.hypot(...delta);
}

function onDeviceMotion(event) {
  if (!snowfall.hidden || cardDialog.open || document.hidden) {
    aboveShakeThreshold = false;
    lastShakePeak = -Infinity;
    gravityEstimate = undefined;
    return;
  }

  const strength = shakeStrength(event);
  if (strength < 7) aboveShakeThreshold = false;
  if (strength < 12 || aboveShakeThreshold) return;
  aboveShakeThreshold = true;

  // Two distinct peaks distinguish a shake from a single bump.
  const elapsed = event.timeStamp - lastShakePeak;
  if (elapsed < 70) return;
  lastShakePeak = event.timeStamp;
  if (elapsed <= 750) setSnowfall(true);
}

if (motion && !requiresMotionPermission) window.addEventListener("devicemotion", onDeviceMotion);

snowToggle.addEventListener("click", async () => {
  setSnowfall(snowfall.hidden);
  if (!requiresMotionPermission || requestedMotionPermission) return;
  requestedMotionPermission = true;

  try {
    if (await motion.requestPermission() === "granted") {
      window.addEventListener("devicemotion", onDeviceMotion);
    }
  } catch {
    // The painted snowglobe still toggles snowfall without sensor access.
  }
});

const fire = document.querySelector(".fire");
const stillFlame = fire.querySelector(".flame");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const flameFrames = [stillFlame];
let activeFrame = 0;
let flameTimer;
let requestedFrames = false;

function advanceFlame() {
  const next = (activeFrame + 1) % flameFrames.length;
  flameFrames[activeFrame].classList.remove("is-lit");
  flameFrames[next].classList.add("is-lit");
  activeFrame = next;
  flameTimer = setTimeout(advanceFlame, 120 + Math.random() * 60);
}

function updateFire() {
  clearTimeout(flameTimer);
  if (reducedMotion.matches || document.hidden) {
    flameFrames[activeFrame].classList.remove("is-lit");
    stillFlame.classList.add("is-lit");
    activeFrame = 0;
    return;
  }

  if (!requestedFrames) {
    requestedFrames = true;
    Promise.all(EXTRA_FLAME_FRAMES.map(async (src) => {
      const frame = new Image(stillFlame.width, stillFlame.height);
      frame.className = "flame";
      frame.alt = "";
      frame.src = src;
      try {
        await frame.decode();
        return frame;
      } catch {
        return null;
      }
    })).then((frames) => {
      for (const frame of frames.filter(Boolean)) {
        fire.append(frame);
        flameFrames.push(frame);
      }
      updateFire();
    });
  }

  if (flameFrames.length > 1) flameTimer = setTimeout(advanceFlame, 150);
}

reducedMotion.addEventListener("change", updateFire);
document.addEventListener("visibilitychange", updateFire);
updateFire();
