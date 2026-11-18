const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function getHeader(request, name) {
  return request.headers.get(name) || "";
}

function isDeviceAuthorized(request, env) {
  return Boolean(env.DEVICE_API_KEY) &&
    getHeader(request, "X-API-Key") === env.DEVICE_API_KEY;
}

function isAdminAuthorized(request, env) {
  return Boolean(env.ADMIN_API_KEY) &&
    getHeader(request, "X-Admin-Key") === env.ADMIN_API_KEY;
}

function rowToConfig(row) {
  return {
    finger: row.finger,
    message: row.base_message,
    emergency: Boolean(row.is_emergency),
    translations: {
      english: row.en,
      tamil: row.ta,
      telugu: row.te,
      malayalam: row.ml,
      hindi: row.hi
    },
    updated_at: row.updated_at
  };
}

function rowToEvent(row) {
  return {
    id: row.id,
    device_id: row.device_id,
    finger: row.finger,
    message: row.base_message,
    emergency: Boolean(row.is_emergency),
    translations: {
      english: row.en,
      tamil: row.ta,
      telugu: row.te,
      malayalam: row.ml,
      hindi: row.hi
    },
    created_at: row.created_at
  };
}

const TRANSLATION_MODEL = "@cf/ai4bharat/indictrans2-en-indic-1B";

function extractTranslation(result) {
  if (!result) return null;

  const directCandidates = [
    result.translated_text,
    result.translation,
    result.text,
    result.response?.translated_text,
    result.response?.translation
  ];

  for (const value of directCandidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (Array.isArray(result.translations) && result.translations.length) {
    const first = result.translations[0];

    if (typeof first === "string" && first.trim()) {
      return first.trim();
    }

    if (first && typeof first === "object") {
      const value =
        first.translation ??
        first.translated_text ??
        first.text ??
        first.output;

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

async function translateOneWithAI(text, targetCode, env) {
  if (!env.AI) {
    throw new Error("Cloudflare Workers AI binding is missing");
  }

  let lastError = null;

  const payloads = [
    {
      text,
      source_language: "eng_Latn",
      target_language: targetCode
    }
  ];

  for (const payload of payloads) {
    try {
      const result = await env.AI.run(
        TRANSLATION_MODEL,
        payload
      );

      const translated = extractTranslation(result);

      if (translated) {
        return translated;
      }

      throw new Error("No translation text returned");
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    "IndicTrans2 translation failed for " +
    targetCode +
    ": " +
    (lastError?.message || "unknown error")
  );
}

async function autoTranslate(text, env) {
  const result = {
    english: text,
    tamil: "",
    telugu: "",
    malayalam: "",
    hindi: ""
  };

  result.tamil =
    await translateOneWithAI(text, "tam_Taml", env);

  result.telugu =
    await translateOneWithAI(text, "tel_Telu", env);

  result.malayalam =
    await translateOneWithAI(text, "mal_Mlym", env);

  result.hindi =
    await translateOneWithAI(text, "hin_Deva", env);

  return result;
}

async function handleApi(request, env, url) {
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (path === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      service: "gloves-proj-api",
      time: new Date().toISOString()
    });
  }

  if (path === "/api/device-config" && request.method === "GET") {
    if (!isDeviceAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized_device" }, 401);
    }

    const data = await env.DB.prepare(
      "SELECT * FROM finger_config ORDER BY finger"
    ).all();

    return json({
      ok: true,
      config: data.results.map(rowToConfig)
    });
  }

  if (path === "/api/config" && request.method === "GET") {
    if (!isAdminAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized_admin" }, 401);
    }

    const data = await env.DB.prepare(
      "SELECT * FROM finger_config ORDER BY finger"
    ).all();

    return json({
      ok: true,
      config: data.results.map(rowToConfig)
    });
  }

  const configMatch = path.match(/^\/api\/config\/([1-5])$/);
  if (configMatch && request.method === "PUT") {
    if (!isAdminAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized_admin" }, 401);
    }

    const finger = Number(configMatch[1]);
    let body;

    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }

    const message = String(body.message || "").trim();
    const emergency = Boolean(body.emergency);

    if (!message) {
      return json({ ok: false, error: "message_required" }, 400);
    }

    if (message.length > 120) {
      return json({ ok: false, error: "message_too_long", max: 120 }, 400);
    }

    let translations;
    try {
      translations = await autoTranslate(message, env);
    } catch (error) {
      return json({
        ok: false,
        error: "translation_failed",
        detail: String(error.message || error)
      }, 502);
    }

    if (emergency) {
      await env.DB.prepare(
        "UPDATE finger_config SET is_emergency = 0, updated_at = CURRENT_TIMESTAMP"
      ).run();
    }

    await env.DB.prepare(`
      UPDATE finger_config
      SET base_message = ?,
          en = ?,
          ta = ?,
          te = ?,
          ml = ?,
          hi = ?,
          is_emergency = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE finger = ?
    `).bind(
      message,
      translations.english,
      translations.tamil,
      translations.telugu,
      translations.malayalam,
      translations.hindi,
      emergency ? 1 : 0,
      finger
    ).run();

    const updated = await env.DB.prepare(
      "SELECT * FROM finger_config WHERE finger = ?"
    ).bind(finger).first();

    return json({
      ok: true,
      message: "Finger configuration updated",
      config: rowToConfig(updated)
    });
  }

  if (path === "/api/event" && request.method === "POST") {
    if (!isDeviceAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized_device" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }

    const finger = Number(body.finger);
    const deviceId = String(body.device_id || "GLOVE_001").trim().slice(0, 64);

    if (!Number.isInteger(finger) || finger < 1 || finger > 5) {
      return json({ ok: false, error: "finger_must_be_1_to_5" }, 400);
    }

    const cfg = await env.DB.prepare(
      "SELECT * FROM finger_config WHERE finger = ?"
    ).bind(finger).first();

    if (!cfg) {
      return json({ ok: false, error: "finger_not_configured" }, 404);
    }

    const insert = await env.DB.prepare(`
      INSERT INTO events
      (device_id, finger, base_message, en, ta, te, ml, hi, is_emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      deviceId,
      finger,
      cfg.base_message,
      cfg.en,
      cfg.ta,
      cfg.te,
      cfg.ml,
      cfg.hi,
      cfg.is_emergency
    ).run();

    return json({
      ok: true,
      event_id: insert.meta.last_row_id,
      finger,
      message: cfg.base_message,
      emergency: Boolean(cfg.is_emergency),
      translations: {
        english: cfg.en,
        tamil: cfg.ta,
        telugu: cfg.te,
        malayalam: cfg.ml,
        hindi: cfg.hi
      }
    });
  }

  if (path === "/api/events" && request.method === "GET") {
    if (!isAdminAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized_admin" }, 401);
    }

    let limit = Number(url.searchParams.get("limit") || 30);
    if (!Number.isInteger(limit)) limit = 30;
    limit = Math.max(1, Math.min(limit, 100));

    const data = await env.DB.prepare(
      "SELECT * FROM events ORDER BY id DESC LIMIT ?"
    ).bind(limit).all();

    return json({
      ok: true,
      events: data.results.map(rowToEvent)
    });
  }

  if (path === "/api/latest" && request.method === "GET") {
    if (!isAdminAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized_admin" }, 401);
    }

    const after = Number(url.searchParams.get("after") || 0);
    const row = await env.DB.prepare(
      "SELECT * FROM events WHERE id > ? ORDER BY id DESC LIMIT 1"
    ).bind(Number.isFinite(after) ? after : 0).first();

    return json({
      ok: true,
      event: row ? rowToEvent(row) : null
    });
  }

  return json({ ok: false, error: "not_found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({
        ok: false,
        error: "server_error",
        detail: String(error.message || error)
      }, 500);
    }
  }
};
