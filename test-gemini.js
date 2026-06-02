import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function loadApiKey() {
  const envPath = resolve(__dirname, ".env");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "VITE_GEMINI_API_KEY") return value;
  }
  throw new Error("VITE_GEMINI_API_KEY not found in .env");
}

async function main() {
  const apiKey = loadApiKey();
  const body = {
    contents: [{ role: "user", parts: [{ text: "Hello" }] }],
  };

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("API error:", res.status, res.statusText);
      console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }

    console.log("Success — full response:");
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Request failed:");
    console.error(err);
    process.exit(1);
  }
}

main();
