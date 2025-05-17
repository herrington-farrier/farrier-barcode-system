const formID = "1FAIpQLSfNv6iahACDQUDPNtUK0Rm1tbHidlwopDH8w3xJe4FaRKjpqg";
const entryID = "entry.1356359293";
const formURL = `https://docs.google.com/forms/d/e/${formID}/formResponse?`;

const scanner = new Html5Qrcode("reader");
let currentCameraId = null;

function playBeep() {
  const beep = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YVwAAAAA");
  beep.play();
}

function submitValue(value) {
  const fullURL = `${formURL}${entryID}=${encodeURIComponent(value)}`;
  fetch(fullURL, { method: "POST", mode: "no-cors" })
    .then(() => showStatus(`✅ Submitted: ${value}`, true))
    .catch(() => queueOffline(value));
}

function showStatus(msg, success) {
  document.getElementById("status").innerText = msg;
  if (success) playBeep();
}

function queueOffline(value) {
  const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
  queue.push({ "value": value, "time": new Date().toISOString() });
  localStorage.setItem("offlineQueue", JSON.stringify(queue));
  showStatus(`📦 Stored offline: ${value}`, true);
}

function flushQueue() {
  const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
  if (navigator.onLine && queue.length > 0) {
    const entry = queue.shift();
    localStorage.setItem("offlineQueue", JSON.stringify(queue));
    submitValue(entry.value);
  }
}

function startCamera(cameraId) {
  scanner.start(
    cameraId,
    { fps: 10, qrbox: 250 },
    value => {
      scanner.stop();
      submitValue(value);
      setTimeout(() => location.reload(), 1500);
    }
  ).catch(err => showStatus(`Camera start error: ${err}`, false));
}

function populateCameraDropdown(cameras) {
  const select = document.getElementById("cameraSelect");
  cameras.forEach(cam => {
    const option = document.createElement("option");
    option.value = cam.id;
    option.text = cam.label || `Camera ${select.length + 1}`;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    scanner.stop().then(() => {
      currentCameraId = select.value;
      startCamera(currentCameraId);
    });
  });
}

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  Html5Qrcode.getCameras().then(cameras => {
    if (cameras.length > 0) {
      populateCameraDropdown(cameras);
      currentCameraId = cameras[0].id;
      startCamera(currentCameraId);
    }
  });
  setInterval(flushQueue, 5000);
});
