import { createServer, type Server } from "node:http";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/giscus";

const preview = "/en/preview/?project=rainy-ramen&model=e2e-fixture";
const assets = "/previews/rainy-ramen/e2e-fixture";

let controls: string;
let server: Server;

test.beforeAll(async ({ baseURL }) => {
  // Playwright's route.fulfill() adds CORS headers, so denial cases need real HTTP.
  server = createServer(async (request, response) => {
    const match = request.url?.match(
      /^\/(none|entry-only|mime)\/(index\.html|main\.js|counter\.mjs|classic\.html|classic\.js)$/,
    );
    if (!match) {
      response.writeHead(404).end();
      return;
    }
    const [, mode, file] = match;
    try {
      const upstream = await fetch(new URL(`${assets}/${file}`, baseURL));
      const body = Buffer.from(await upstream.arrayBuffer());
      response.setHeader("Cache-Control", "no-store");
      response.setHeader(
        "Content-Type",
        mode === "mime" && file === "counter.mjs"
          ? "text/html"
          : upstream.headers.get("content-type")!,
      );
      if (mode === "mime" || (mode === "entry-only" && file === "main.js"))
        response.setHeader("Access-Control-Allow-Origin", "*");
      response.writeHead(upstream.status).end(body);
    } catch {
      response.writeHead(502).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  controls = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  server?.closeAllConnections();
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function openControl(page: Page, file: string) {
  await page.locator(".preview-container iframe").evaluate((frame, src) => {
    (frame as HTMLIFrameElement).src = src;
  }, `${controls}/${file}`);
}

test("module entries and relative .mjs imports run with parent isolation", async ({
  page,
}) => {
  const loaded = Promise.all(
    ["main.js", "counter.mjs"].map((file) =>
      page.waitForResponse((response) =>
        response.url().endsWith(`${assets}/${file}`),
      ),
    ),
  );
  await page.goto(preview);
  for (const response of await loaded) {
    expect(response.status()).toBe(200);
    expect(response.headers()["access-control-allow-origin"]).toBe("*");
    expect(response.headers()["content-type"]).toMatch(
      /^(?:text|application)\/javascript(?:;|$)/,
    );
    expect((await response.request().allHeaders()).origin).toBe("null");
  }
  await expect(page).toHaveTitle("E2E fixture - Rainy Ramen - Variora");
  await expect(page.locator(".preview-container iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-pointer-lock",
  );
  const frame = page.frameLocator(".preview-container iframe");
  await expect(frame.getByText("Parent isolated")).toBeVisible();
  await frame.getByRole("button", { name: "Count: 0" }).click();
  await expect(frame.getByRole("button")).toHaveText("Count: 1");
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(frame.getByRole("button")).toHaveText("Count: 0");
  await page.getByRole("button", { name: "Full screen", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Exit full screen", exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Exit full screen", exact: false })
    .click();
  await page.getByRole("link", { name: "Back to project" }).click();
  await expect(page.locator("h1")).toHaveText("Rainy Ramen");
  await expect(page).toHaveTitle("Rainy Ramen - Variora");
});

test("direct navigation runs the module graph without CORS headers", async ({
  page,
}) => {
  await page.goto(`${controls}/none/index.html`);
  await page.getByRole("button", { name: "Count: 0" }).click();
  await expect(page.getByRole("button")).toHaveText("Count: 1");
});

for (const { name, mode, blocked } of [
  {
    name: "the whole module graph lacks CORS headers",
    mode: "none",
    blocked: "main.js",
  },
  {
    name: "only the entry has CORS headers",
    mode: "entry-only",
    blocked: "counter.mjs",
  },
]) {
  test(`sandbox blocks execution when ${name}`, async ({ page }) => {
    await page.goto(preview);
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    const failure = page.waitForEvent(
      "console",
      (message) =>
        message.text().includes(`${controls}/${mode}/${blocked}`) &&
        message.text().includes("CORS policy"),
    );
    await openControl(page, `${mode}/index.html`);
    await failure;
    await expect(
      page.frameLocator(".preview-container iframe").locator("#isolation"),
    ).toBeEmpty();
    expect(requested.includes(`${controls}/${mode}/counter.mjs`)).toBe(
      blocked === "counter.mjs",
    );
  });
}

test("sandbox rejects a dependency with a non-JavaScript MIME type", async ({
  page,
}) => {
  await page.goto(preview);
  const failure = page.waitForEvent(
    "console",
    (message) =>
      message.text().includes("MIME type") &&
      message.text().includes("text/html"),
  );
  await openControl(page, "mime/index.html");
  await failure;
  await expect(
    page.frameLocator(".preview-container iframe").locator("#isolation"),
  ).toBeEmpty();
});

test("comments follow the implementation, language, and theme", async ({
  page,
}) => {
  const widget = () =>
    page.locator(".giscus iframe").evaluateAll((frames) =>
      frames.map((frame) => {
        const url = new URL(frame.getAttribute("src")!);
        return {
          lang: url.pathname,
          term: url.searchParams.get("term"),
          theme: url.searchParams.get("theme"),
          mapping: [
            url.searchParams.get("strict"),
            url.searchParams.get("inputPosition"),
            frame.getAttribute("loading"),
          ],
        };
      }),
    );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(preview.replace("/en/", "/zh/"));
  await expect(page.locator(".comments h2")).toHaveText("评论");
  const config = await page
    .locator('script[src="https://giscus.app/client.js"]')
    .evaluate((script) => ({ ...(script as HTMLScriptElement).dataset }));
  expect(config).toMatchObject({
    repo: "scarletkc/variora",
    repoId: "R_kgDOUksvGg",
    category: "Announcements",
    categoryId: "DIC_kwDOUksvGs4DGKRY",
    mapping: "specific",
    reactionsEnabled: "1",
    emitMetadata: "0",
  });
  await expect(page.locator(".giscus iframe")).toHaveCount(1);
  expect(await widget()).toEqual([
    {
      lang: "/zh-CN/widget",
      term: "rainy-ramen/e2e-fixture",
      theme: "transparent_dark",
      mapping: ["1", "top", "lazy"],
    },
  ]);
  // A query-only navigation keeps Preview mounted; the discussion must follow.
  await page.evaluate(() =>
    history.pushState(
      null,
      "",
      "/zh/preview/?project=neon-serpent&model=e2e-fixture",
    ),
  );
  await expect(page.locator("h1")).toHaveText("E2E fixture");
  await expect(page.locator(".giscus iframe")).toHaveAttribute(
    "src",
    /term=neon-serpent%2Fe2e-fixture&/,
  );
  await page.evaluate(() =>
    history.pushState(
      null,
      "",
      "/zh/preview/?project=neon-serpent&model=e2e-fixture-2",
    ),
  );
  await expect(page.locator(".giscus iframe")).toHaveAttribute(
    "src",
    /term=neon-serpent%2Fe2e-fixture-2&/,
  );
  await expect(page.locator(".giscus iframe")).toHaveCount(1);
  await expect(page.locator('script[src^="https://giscus.app/"]')).toHaveCount(
    1,
  );
  await page.locator(".comments").scrollIntoViewIfNeeded();
  await expect(
    page.frameLocator(".giscus iframe").locator("html"),
  ).toHaveAttribute("data-theme", "transparent_dark");
  await page.getByLabel("外观").click();
  await page.getByRole("option", { name: "亮色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator(".comments").scrollIntoViewIfNeeded();
  await expect(
    page.frameLocator(".giscus iframe").locator("html"),
  ).toHaveAttribute("data-theme", "light");
  await page.getByLabel("语言").click();
  await page.getByRole("option", { name: "EN", exact: true }).click();
  await expect(page.locator(".comments h2")).toHaveText("Comments");
  await expect.poll(widget).toEqual([
    {
      lang: "/en/widget",
      term: "neon-serpent/e2e-fixture-2",
      theme: "light",
      mapping: ["1", "top", "lazy"],
    },
  ]);
});

test("comments receive the current theme when the widget loads late", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => (release = resolve));
  await page.route(/https:\/\/giscus\.app\/[\w-]+\/widget\?/, async (route) => {
    await ready;
    await route.fallback();
  });
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    // The widget intentionally remains pending, so do not wait for page load.
    await page.goto(preview, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".giscus iframe")).toHaveAttribute(
      "src",
      /theme=transparent_dark/,
    );
    await page.getByLabel("Appearance").click();
    await page.getByRole("option", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    release();
    await page.locator(".comments").scrollIntoViewIfNeeded();
    await expect(
      page.frameLocator(".giscus iframe").locator("html"),
    ).toHaveAttribute("data-theme", "light");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("self-contained classic scripts run in the sandbox without CORS headers", async ({
  page,
}) => {
  await page.goto(preview);
  await openControl(page, "none/classic.html");
  await expect(
    page.frameLocator(".preview-container iframe").locator("#ready"),
  ).toHaveText("Ready");
});
