import { domToPng } from "modern-screenshot";
import type { CodeFile } from "./types";

const VIEWPORT_WIDTH = 1024;
const MAX_HEIGHT = 1600;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function basename(path: string) {
  return path.split(/[\\/]/).pop()?.split("?")[0] ?? path;
}

/**
 * Builds one self-contained HTML document for a question: linked stylesheets
 * and scripts that were uploaded are inlined; uploaded CSS/JS that the page
 * never links is still added, since that is almost always what the student meant.
 */
export function buildDocument(files: CodeFile[]) {
  const html = files.find((f) => f.language === "html");
  const styles = files.filter((f) => f.language === "css");
  const scripts = files.filter((f) => f.language === "js");

  let doc =
    html?.content ??
    `<!doctype html><html><head></head><body>${
      // A stylesheet on its own has nothing to style; show it on a neutral sample page.
      scripts.length ? "" : "<h1>Heading</h1><p>Paragraph text</p><a href='#'>Link</a><button>Button</button>"
    }</body></html>`;

  const used = new Set<string>();

  for (const css of styles) {
    const link = new RegExp(
      `<link[^>]*href=["']?[^"'>]*${escapeRegExp(basename(css.name))}["']?[^>]*>`,
      "gi",
    );
    if (link.test(doc)) {
      // Function replacers so "$" in student code isn't read as a replacement pattern.
      doc = doc.replace(link, () => `<style>\n${css.content}\n</style>`);
      used.add(css.id);
    }
  }
  for (const js of scripts) {
    const tag = new RegExp(
      `<script[^>]*src=["']?[^"'>]*${escapeRegExp(basename(js.name))}["']?[^>]*>\\s*</script>`,
      "gi",
    );
    if (tag.test(doc)) {
      doc = doc.replace(tag, () => `<script>\n${js.content}\n</script>`);
      used.add(js.id);
    }
  }

  const extraCss = styles.filter((f) => !used.has(f.id)).map((f) => `<style>\n${f.content}\n</style>`).join("\n");
  const extraJs = scripts.filter((f) => !used.has(f.id)).map((f) => `<script>\n${f.content}\n</script>`).join("\n");

  if (extraCss) doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, () => `${extraCss}\n</head>`) : extraCss + doc;
  if (extraJs) doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, () => `${extraJs}\n</body>`) : doc + extraJs;

  return doc;
}

/**
 * Renders the question's page in a hidden iframe at a desktop width and
 * captures it as a PNG, cropped to the page's real height.
 */
export async function captureWebOutput(files: CodeFile[]) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${VIEWPORT_WIDTH}px;height:800px;border:0;background:#fff;`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("The page took longer than 8 seconds to load.")), 8000);
      iframe.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      iframe.srcdoc = buildDocument(files);
    });

    const doc = iframe.contentDocument;
    if (!doc) throw new Error("The page could not be opened for a screenshot.");

    // Let fonts, images and any start-up scripts settle.
    await doc.fonts?.ready;
    await new Promise((r) => setTimeout(r, 400));

    // The screenshot re-measures text slightly wider than the browser did, which
    // can push a one-line button label onto two lines. Buttons never wrap here.
    const fix = doc.createElement("style");
    fix.textContent = "button, input[type=button], input[type=submit] { white-space: nowrap; }";
    doc.head?.appendChild(fix);

    // Shrink the frame first so scrollHeight reports the content, not the frame.
    iframe.style.height = "100px";
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const height = Math.min(
      MAX_HEIGHT,
      Math.max(160, doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0),
    );
    iframe.style.height = `${height}px`;
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    // Browsers paint the body's background across the whole window when <html>
    // has none; the screenshot library doesn't, so do it explicitly.
    const root = doc.documentElement;
    const rootStyle = getComputedStyle(root);
    const transparent = (bg: string) => bg === "rgba(0, 0, 0, 0)" || bg === "transparent";
    if (doc.body && transparent(rootStyle.backgroundColor) && rootStyle.backgroundImage === "none") {
      const bodyStyle = getComputedStyle(doc.body);
      root.style.backgroundColor = bodyStyle.backgroundColor;
      root.style.backgroundImage = bodyStyle.backgroundImage;
      root.style.minHeight = `${height}px`;
    }

    const rootBg = getComputedStyle(root).backgroundColor;
    const image = await domToPng(root, {
      width: VIEWPORT_WIDTH,
      height,
      scale: 1.5,
      backgroundColor: transparent(rootBg) ? "#ffffff" : rootBg,
    });
    return { image, width: VIEWPORT_WIDTH, height };
  } finally {
    iframe.remove();
  }
}
