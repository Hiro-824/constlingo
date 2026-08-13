import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const [
  url,
  output,
  widthValue = "1440",
  heightValue = "1000",
  fullPageValue = "false",
  waitValue = "650",
  fixture = "",
] = process.argv.slice(2);
if (!url || !output) {
  throw new Error("Usage: node scripts/capture-ui.mjs <url> <output> [width] [height] [fullPage]");
}

const width = Number(widthValue);
const height = Number(heightValue);
const fullPage = fullPageValue === "true";
const waitMilliseconds = Number(waitValue);
const target = await fetch("http://127.0.0.1:9223/json/new?about%3Ablank", {
  method: "PUT",
}).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
let commandId = 0;
const pending = new Map();
const events = new Map();

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    callback?.(message);
    return;
  }
  const listeners = events.get(message.method) ?? [];
  events.delete(message.method);
  listeners.forEach((listener) => listener(message.params));
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => {
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  });
}

function waitFor(method) {
  return new Promise((resolve) => {
    events.set(method, [...(events.get(method) ?? []), resolve]);
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 500,
  screenWidth: width,
  screenHeight: height,
});

if (fixture === "result") {
  const originLoaded = waitFor("Page.loadEventFired");
  await send("Page.navigate", { url: new URL("/", url).href });
  await originLoaded;
  const result = {
    questions: [
      {
        id: "fixture:hola",
        kind: "productive",
        item: {
          id: "hola",
          categoryId: "最初のあいさつ・反応",
          target: "hola",
          meaning: "こんにちは",
          partOfSpeech: "",
          note: "",
          spokenForm: "hola",
          acceptedSpokenForms: ["hola"],
        },
        attempts: 1,
        firstAttemptCorrect: false,
        firstResponse: "ola",
        completed: false,
        skipped: false,
        lastRecognized: "ola",
      },
    ],
    mode: {
      plan: "mixed",
      questionSelection: { method: "random", start: 1, end: 20, count: 20 },
      showDrillSpelling: true,
    },
    selection: { kind: "all", id: "all", label: "全範囲" },
  };
  await send("Runtime.evaluate", {
    expression: `sessionStorage.setItem("constlingo-last-result-v1", ${JSON.stringify(JSON.stringify(result))})`,
  });
}

const loaded = waitFor("Page.loadEventFired");
await send("Page.navigate", { url });
await loaded;
await new Promise((resolve) => setTimeout(resolve, waitMilliseconds));

const viewport = await send("Runtime.evaluate", {
  expression: "JSON.stringify({ innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight })",
  returnByValue: true,
});
console.log(viewport.result.value);

const metrics = await send("Page.getLayoutMetrics");
const clip = fullPage
  ? {
      x: 0,
      y: 0,
      width: Math.min(metrics.cssContentSize.width, width),
      height: metrics.cssContentSize.height,
      scale: 1,
    }
  : { x: 0, y: 0, width, height, scale: 1 };
const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  fromSurface: true,
  captureBeyondViewport: fullPage,
  clip,
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.from(screenshot.data, "base64"));
socket.close();
