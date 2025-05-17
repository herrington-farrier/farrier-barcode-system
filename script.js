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

function startCamera(cameraIdOrFacingMode = null) {
  const config = { fps: 10, qrbox: 250 };

  let startConfig;

  if (cameraIdOrFacingMode) {
    if (typeof cameraIdOrFacingMode === "object") {
      startConfig = cameraIdOrFacingMode;
    } else {
      startConfig = { deviceId: { exact: cameraIdOrFacingMode } };
    }
  } else {
    startConfig = { facingMode: { exact: "environment" } };
  }

  scanner.start(
    startConfig,
    config,
    value => {
      scanner.stop();
      submitValue(value);
      setTimeout(() => location.reload(), 1500);
    }
  ).catch(err => showStatus(`Camera start error: ${err}`, false));
}


function populateCameraDropdown(cameras) {
 const select = document.getElementById("cameraSelect");
  if (!select) {
    console.warn("Dropdown not found. Skipping dropdown population.");
    return;
  }
  select.innerHTML = "";
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
    }).catch(() => {
      currentCameraId = select.value;
      startCamera(currentCameraId);
    });
  });
}

function manualStart() {
  const select = document.getElementById("cameraSelect");
  const selectedCam = select.value;
  if (selectedCam) {
    scanner.stop().then(() => {
      startCamera(selectedCam);
    }).catch(() => {
      startCamera(selectedCam);
    });
  } else {
    showStatus("❌ No camera selected", false);
  }
}

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

  Html5Qrcode.getCameras().then(cameras => {
    console.log("Cameras found:", cameras);
    const select = document.getElementById("cameraSelect");
    console.log("Dropdown detected:", select);

    if (cameras.length > 0) {
      populateCameraDropdown(cameras);

      const rearCam = cameras.find(c => (
        (c.label || "").toLowerCase().includes("back") ||
        (c.label || "").toLowerCase().includes("rear") ||
        (c.label || "").toLowerCase().includes("environment")
      ));

      if (rearCam && rearCam.id) {
        currentCameraId = rearCam.id;
        startCamera(currentCameraId);
      } else {
        console.warn("No labeled rear cam found, falling back to facingMode.");
        startCamera(); // fallback to facingMode: environment
      }
    } else {
      showStatus("❌ No cameras available", false);
    }
  }).catch(err => {
    console.error("getCameras error:", err);
    showStatus(`Camera error: ${err}`, false);
    // fallback to default rear camera if possible
    startCamera(); // will use facingMode: environment
  });

  setInterval(flushQueue, 5000);
});
