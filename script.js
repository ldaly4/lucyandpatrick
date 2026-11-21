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
