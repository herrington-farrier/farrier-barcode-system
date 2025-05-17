const formID = "1FAIpQLSfNv6iahACDQUDPNtUK0Rm1tbHidlwopDH8w3xJe4FaRKjpqg";
const entryID = "entry.1356359293";
const formURL = `https://docs.google.com/forms/d/e/${formID}/formResponse?`;

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

setInterval(flushQueue, 5000);

const scanner = new Html5Qrcode("reader");
Html5Qrcode.getCameras().then(cameras => {
  if (cameras.length) {
    scanner.start(
      cameras[0].id,
      { fps: 10, qrbox: 250 },
      value => {
        scanner.stop();
        submitValue(value);
        setTimeout(() => location.reload(), 1500);
      }
    );
  }
}).catch(err => showStatus(`Camera error: ${err}`, false));

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
});
