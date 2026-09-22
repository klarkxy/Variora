"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";

const giscus = "https://giscus.app";
const discussions = {
  repo: "scarletkc/variora",
  repoId: "R_kgDOUksvGg",
  category: "Announcements",
  categoryId: "DIC_kwDOUksvGs4DGKRY",
};
const giscusLang: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
};

// The site theme is pure white/black; transparent_dark lets --bg show through.
const giscusTheme = () =>
  document.documentElement.dataset.theme === "dark"
    ? "transparent_dark"
    : "light";

function syncTheme(host: HTMLElement) {
  host
    .querySelector("iframe")
    ?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: giscusTheme() } } },
      giscus,
    );
}

export function Comments({ term, locale }: { term: string; locale: Locale }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = host.current!;
    const container = root.querySelector(".giscus")!;
    const script = document.createElement("script");
    Object.assign(script.dataset, discussions, {
      mapping: "specific",
      term,
      strict: "1",
      reactionsEnabled: "1",
      emitMetadata: "0",
      inputPosition: "top",
      theme: giscusTheme(),
      lang: giscusLang[locale],
      loading: "lazy",
    });
    script.src = `${giscus}/client.js`;
    script.crossOrigin = "anonymous";
    script.async = true;
    // client.js fills .giscus with the iframe; the lazy widget may load after
    // the preference changed, so push the current theme once it is ready.
    script.addEventListener("load", () =>
      root
        .querySelector("iframe")
        ?.addEventListener("load", () => syncTheme(root)),
    );
    root.append(script);
    const observer = new MutationObserver(() => syncTheme(root));
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
    });
    return () => {
      observer.disconnect();
      script.remove();
      container.replaceChildren();
    };
  }, [term, locale]);
  return (
    <div ref={host}>
      <div className="giscus" id="comments" />
    </div>
  );
}
