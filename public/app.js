const state = {
  adminKey: localStorage.getItem("gloves_admin_key") || "",
  connected: false,
  lastEventId: 0,
  editFinger: null,
  pollTimer: null,
  emergencyTimer: null
};

const $ = (id) => document.getElementById(id);

function adminHeaders(jsonBody = false) {
  const headers = { "X-Admin-Key": state.adminKey };
  if (jsonBody) headers["Content-Type"] = "application/json";
  return headers;
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const message = data.detail || data.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function setStatus(id, text, type = "neutral") {
  const el = $(id);
  el.textContent = text;
  el.className = `status ${type}`;
}

function setMessage(id, text, type = "") {
  const el = $(id);
  el.textContent = text || "";
  el.className = `small-message ${type}`;
}

async function checkApiHealth() {
  try {
    await api("/api/health");
    setStatus("apiStatus", "CLOUD API ONLINE", "ok");
  } catch {
    setStatus("apiStatus", "API OFFLINE", "danger");
  }
}

function renderConfig(config) {
  const list = $("fingerConfigList");
  if (!config.length) {
    list.innerHTML = '<div class="empty-state">No configuration found.</div>';
    return;
  }

  list.innerHTML = config.map(item => `
    <div class="config-row">
      <div class="finger-badge">Finger ${item.finger}</div>
      <div>
        <div class="message-main">${escapeHtml(item.message)}</div>
        ${item.emergency ? '<div class="emergency-tag">EMERGENCY FINGER</div>' : ''}
      </div>
      <div class="translation-preview">
        TA: ${escapeHtml(item.translations.tamil)}<br>
        TE: ${escapeHtml(item.translations.telugu)}<br>
        ML: ${escapeHtml(item.translations.malayalam)}<br>
        HI: ${escapeHtml(item.translations.hindi)}
      </div>
      <button data-edit-finger="${item.finger}">Edit</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-edit-finger]").forEach(btn => {
    btn.addEventListener("click", () => {
      const finger = Number(btn.dataset.editFinger);
      const item = config.find(x => x.finger === finger);
      openEdit(item);
    });
  });
}

function renderEvents(events) {
  const body = $("eventTableBody");
  if (!events.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-cell">No glove events yet.</td></tr>';
    return;
  }

  body.innerHTML = events.map(event => `
    <tr>
      <td>${event.id}</td>
      <td>${formatTime(event.created_at)}</td>
      <td>${escapeHtml(event.device_id)}</td>
      <td>Finger ${event.finger}</td>
      <td>${escapeHtml(event.message)}</td>
      <td>${event.emergency ? "EMERGENCY" : "Normal"}</td>
    </tr>
  `).join("");
}

function renderLiveEvent(event, triggerEmergency = true) {
  if (!event) return;

  state.lastEventId = Math.max(state.lastEventId, event.id || 0);
  $("lastFinger").textContent = `Finger ${event.finger}`;
  $("currentMessage").textContent = event.message;
  $("eventType").textContent = event.emergency ? "EMERGENCY" : "Normal";
  $("lastEventTime").textContent = formatTime(event.created_at);

  $("langEnglish").textContent = event.translations.english;
  $("langTamil").textContent = event.translations.tamil;
  $("langTelugu").textContent = event.translations.telugu;
  $("langMalayalam").textContent = event.translations.malayalam;
  $("langHindi").textContent = event.translations.hindi;

  setStatus(
    "deviceStatus",
    `LAST EVENT: FINGER ${event.finger}`,
    event.emergency ? "danger" : "ok"
  );

  if (event.emergency && triggerEmergency) {
    showEmergency(event.message);
  }
}

async function loadConfig() {
  const data = await api("/api/config", { headers: adminHeaders() });
  renderConfig(data.config || []);
}

async function loadEvents() {
  const data = await api("/api/events?limit=30", { headers: adminHeaders() });
  const events = data.events || [];
  renderEvents(events);

  if (events.length) {
    const newest = events[0];
    state.lastEventId = Math.max(state.lastEventId, newest.id);
    renderLiveEvent(newest, false);
  }
}

async function connectDashboard() {
  state.adminKey = $("adminKey").value.trim();
  if (!state.adminKey) {
    setMessage("connectMessage", "Enter the admin API key.", "error");
    return;
  }

  try {
    setMessage("connectMessage", "Connecting...");
    const data = await api("/api/config", { headers: adminHeaders() });
    localStorage.setItem("gloves_admin_key", state.adminKey);
    state.connected = true;
    renderConfig(data.config || []);
    await loadEvents();
    setMessage("connectMessage", "Dashboard connected.", "success");
    startPolling();
  } catch (error) {
    state.connected = false;
    setMessage("connectMessage", `Connection failed: ${error.message}`, "error");
  }
}

function startPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = setInterval(pollLatest, 1000);
}

async function pollLatest() {
  if (!state.connected) return;

  try {
    const data = await api(`/api/latest?after=${state.lastEventId}`, {
      headers: adminHeaders()
    });

    if (data.event) {
      renderLiveEvent(data.event);
      await loadEvents();
    }
  } catch (error) {
    if (error.message === "unauthorized_admin") {
      state.connected = false;
      setMessage("connectMessage", "Admin key is no longer valid.", "error");
      clearInterval(state.pollTimer);
    }
  }
}

function openEdit(item) {
  state.editFinger = item.finger;
  $("editTitle").textContent = `Finger ${item.finger}`;
  $("editMessage").value = item.message;
  $("editEmergency").checked = item.emergency;
  setMessage("saveMessage", "");
  $("editModal").classList.remove("hidden");
  setTimeout(() => $("editMessage").focus(), 50);
}

function closeEdit() {
  $("editModal").classList.add("hidden");
  state.editFinger = null;
}

async function saveEdit() {
  const finger = state.editFinger;
  const message = $("editMessage").value.trim();
  const emergency = $("editEmergency").checked;

  if (!finger || !message) {
    setMessage("saveMessage", "Message is required.", "error");
    return;
  }

  const btn = $("saveEditBtn");
  btn.disabled = true;
  btn.textContent = "Translating & Saving...";

  try {
    await api(`/api/config/${finger}`, {
      method: "PUT",
      headers: adminHeaders(true),
      body: JSON.stringify({ message, emergency })
    });

    setMessage("saveMessage", "Saved. New translations generated.", "success");
    await loadConfig();
    setTimeout(closeEdit, 650);
  } catch (error) {
    setMessage("saveMessage", `Save failed: ${error.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save & Auto Translate";
  }
}

function showEmergency(message) {
  const overlay = $("emergencyOverlay");
  $("emergencyMessage").textContent = message || "Assistance required";
  overlay.classList.remove("hidden");

  if (state.emergencyTimer) clearInterval(state.emergencyTimer);

  let remaining = 10;
  $("emergencyCountdown").textContent = remaining;

  state.emergencyTimer = setInterval(() => {
    remaining -= 1;
    $("emergencyCountdown").textContent = Math.max(remaining, 0);

    if (remaining <= 0) {
      clearInterval(state.emergencyTimer);
      overlay.classList.add("hidden");
    }
  }, 1000);
}

function formatTime(value) {
  if (!value) return "--";

  const normalized =
    value.includes("T") ? value : value.replace(" ", "T") + "Z";

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("connectBtn").addEventListener("click", connectDashboard);

$("clearKeyBtn").addEventListener("click", () => {
  localStorage.removeItem("gloves_admin_key");
  state.adminKey = "";
  state.connected = false;
  $("adminKey").value = "";
  setMessage("connectMessage", "Saved admin key cleared.");

  if (state.pollTimer) clearInterval(state.pollTimer);
});

$("refreshConfigBtn").addEventListener("click", () => {
  if (state.connected) loadConfig();
});

$("refreshEventsBtn").addEventListener("click", () => {
  if (state.connected) loadEvents();
});

$("closeModalBtn").addEventListener("click", closeEdit);
$("cancelEditBtn").addEventListener("click", closeEdit);
$("saveEditBtn").addEventListener("click", saveEdit);

$("editModal").addEventListener("click", (e) => {
  if (e.target === $("editModal")) closeEdit();
});

$("adminKey").value = state.adminKey;
checkApiHealth();

if (state.adminKey) {
  connectDashboard();
}
