"use strict";

const http = require("http");

const apiKey = process.env.OPENAI_API_KEY;
const modelCandidates = (process.env.FOOD_AI_MODEL_CANDIDATES || "gpt-5.5,gpt-5.4,gpt-4.1,gpt-4.1-mini")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Export a fresh key before starting this proxy.");
  process.exit(1);
}

const assistantInstructions = [
  "You are Private Chef's premium food, health, gym, meal planning, and wellbeing assistant.",
  "You may help with meals, recipes, cooking technique, groceries, ingredient swaps, fitness nutrition, calorie planning, hydration, meal prep, food safety, cook-booking decisions, and health-conscious eating habits.",
  "You should feel warm, conversational, emotionally intelligent, and steady, like a trusted food diary, thoughtful friend, and careful nutrition companion inside the app.",
  "You may support reflection, motivation, stress-aware eating decisions, routine building, and gentle check-ins, but stay grounded in food, wellness, cooking, recovery, and the app's service world.",
  "If the user asks for something unrelated to food, meals, cooking, nutrition, health, fitness, groceries, recipes, or the app's chef-booking workflow, politely refuse and redirect them back to relevant topics.",
  "Do not diagnose disease or prescribe medication. Do not replace crisis support, therapy, or medical care. For self-harm, medical emergencies, symptoms, pregnancy complications, eating disorders, severe allergies, or chronic-condition treatment changes, urge professional care.",
  "Keep answers practical, warm, and high signal. Prefer concrete meal ideas, steps, portion suggestions, macros, swaps, and next actions.",
].join(" ");

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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .map((content) => {
      if (typeof content?.text === "string") {
        return content.text;
      }

      if (typeof content?.output_text === "string") {
        return content.output_text;
      }

      return "";
    })
    .join("\n")
    .trim();
}

async function createResponse(messages) {
  const lastErrorMessages = [];

  for (const model of modelCandidates) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: assistantInstructions,
        input: messages,
        temperature: 0.8,
        store: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastErrorMessages.push(`${model}: ${errorText}`);

      if (response.status === 404 || response.status === 400 || response.status === 403) {
        continue;
      }

      throw new Error(errorText || `OpenAI request failed with ${response.status}`);
    }

    const data = await response.json();
    const reply = extractOutputText(data);

    if (reply) {
      return { reply, model };
    }
  }

  throw new Error(lastErrorMessages.join(" | ") || "The assistant did not return any text.");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/food-ai") {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter((item) => item && (item.role === "user" || item.role === "assistant"))
          .map((item) => ({
            role: item.role,
            content: typeof item.content === "string" ? item.content : "",
          }))
          .filter((item) => item.content.trim())
      : [];

    if (!messages.length) {
      sendJson(res, 400, { ok: false, error: "A messages array is required." });
      return;
    }

    const result = await createResponse(messages);
    sendJson(res, 200, { ok: true, reply: result.reply, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The food assistant failed.";
    sendJson(res, 500, { ok: false, error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Food AI proxy listening on http://${host}:${port}/food-ai`);
});
