"use strict";

const http = require("http");
const { createClient } = require("@supabase/supabase-js");

const port = Number(process.env.PORT || 8788);
const host = process.env.HOST || "0.0.0.0";
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error("Missing Supabase values. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  );
}

async function verifyRequest(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error("Missing bearer token.");
  }

  const { data, error } = await publicSupabase.auth.getUser(match[1]);
  if (error || !data.user) {
    throw new Error("Invalid Supabase access token.");
  }

  return data.user;
}

async function sendExpoPushNotifications(tokens, notification) {
  const messages = uniqueStrings(tokens).map((token) => ({
    to: token,
    sound: "default",
    title: notification.title || "Private Chef",
    body: notification.body || "",
    data: {
      notificationId: notification.notificationId || "",
      bookingId: notification.bookingId || "",
      threadId: notification.threadId || "",
      type: notification.type || "account_activity",
    },
  }));

  if (!messages.length) {
    return { ok: true, sent: 0 };
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push send failed with ${response.status}: ${await response.text()}`);
  }

  return { ok: true, sent: messages.length };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/push-notify") {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }

  try {
    await verifyRequest(req);
    const body = await readJsonBody(req);
    const recipientId = typeof body.recipientId === "string" ? body.recipientId.trim() : "";

    if (!recipientId) {
      sendJson(res, 400, { ok: false, error: "recipientId is required." });
      return;
    }

    const { data: user, error } = await adminSupabase
      .from("users")
      .select("expoPushTokens")
      .eq("id", recipientId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const tokens = Array.isArray(user?.expoPushTokens) ? user.expoPushTokens : [];
    const result = await sendExpoPushNotifications(tokens, body);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Push relay failed.",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Expo push relay listening on http://${host}:${port}/push-notify`);
});
