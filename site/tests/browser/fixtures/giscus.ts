import { test as base, expect } from "@playwright/test";

// Model the external script/iframe boundary without GitHub or Giscus network I/O.
// Assertions belong in the tests; the fixture only forwards configuration and
// receives the same cross-origin theme messages as the hosted widget.
const client = `(() => {
  const script = document.currentScript;
  const frame = document.createElement("iframe");
  frame.src = "https://giscus.app/" + script.dataset.lang + "/widget?" +
    new URLSearchParams(script.dataset);
  frame.loading = script.dataset.loading;
  frame.title = "Comments";
  document.querySelector(".giscus").replaceChildren(frame);
})();`;

const widget = `<!doctype html><html><head><title>Comments fixture</title></head>
<body><script>
  document.documentElement.dataset.theme = new URL(location.href).searchParams.get("theme");
  addEventListener("message", (event) => {
    if (event.source !== parent) return;
    const theme = event.data?.giscus?.setConfig?.theme;
    if (typeof theme === "string") document.documentElement.dataset.theme = theme;
  });
</script></body></html>`;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("https://giscus.app/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/client.js") {
        await route.fulfill({ contentType: "text/javascript", body: client });
      } else if (/^\/[\w-]+\/widget$/.test(pathname)) {
        await route.fulfill({ contentType: "text/html", body: widget });
      } else {
        await route.abort();
      }
    });
    await use(page);
  },
});

export { expect };
