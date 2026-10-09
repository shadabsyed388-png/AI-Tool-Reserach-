"use strict";

/* ------------------------------------------------------------------ *
 * Extraction function — runs in the page context (no closure access). *
 * Must be fully self-contained and return a serializable object.      *
 * ------------------------------------------------------------------ */
function extractSeoData() {
  const text = (el) => (el && el.textContent ? el.textContent.trim() : "");
  const attr = (sel, name) => {
    const el = document.querySelector(sel);
    return el ? (el.getAttribute(name) || "").trim() : "";
  };
  const metaName = (name) => attr(`meta[name="${name}" i]`, "content");
  const metaProp = (prop) => attr(`meta[property="${prop}" i]`, "content");

  // Headings outline
  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => ({
    level: parseInt(h.tagName.substring(1), 10),
    text: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200),
  }));
  const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  headings.forEach((h) => { headingCounts["h" + h.level]++; });

  // Images
  const imgs = Array.from(document.images);
  const imgsNoAlt = imgs.filter((i) => !i.getAttribute("alt") || !i.getAttribute("alt").trim()).length;

  // Links
  const origin = location.origin;
  const anchors = Array.from(document.querySelectorAll("a[href]"));
  let internal = 0, external = 0, nofollow = 0;
  const linkList = [];
  anchors.forEach((a) => {
    const href = a.href;
    if (!href || href.startsWith("javascript:")) return;
    let isInternal = false;
    try { isInternal = new URL(href).origin === origin; } catch (e) { return; }
    isInternal ? internal++ : external++;
    const rel = (a.getAttribute("rel") || "").toLowerCase();
    if (rel.includes("nofollow")) nofollow++;
    if (linkList.length < 300) {
      linkList.push({
        href,
        text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80) || "(no text)",
        type: isInternal ? "internal" : "external",
        nofollow: rel.includes("nofollow"),
      });
    }
  });

  // Canonical / hreflang
  const canonical = attr('link[rel="canonical" i]', "href");
  const hreflang = Array.from(document.querySelectorAll('link[rel="alternate" i][hreflang]')).map((l) => ({
    lang: l.getAttribute("hreflang"),
    href: l.getAttribute("href"),
  }));

  // Robots & indexability
  const robots = metaName("robots");
  const noindex = /noindex/i.test(robots);

  // Word count (visible body text, rough)
  const bodyText = (document.body ? document.body.innerText || "" : "");
  const wordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;

  // Open Graph
  const og = {
    title: metaProp("og:title"),
    description: metaProp("og:description"),
    image: metaProp("og:image"),
    url: metaProp("og:url"),
    type: metaProp("og:type"),
    siteName: metaProp("og:site_name"),
  };

  // Twitter cards
  const twitter = {
    card: metaName("twitter:card"),
    title: metaName("twitter:title"),
    description: metaName("twitter:description"),
    image: metaName("twitter:image"),
    site: metaName("twitter:site"),
  };

  // Structured data (JSON-LD)
  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
    try { return JSON.stringify(JSON.parse(s.textContent), null, 2); }
    catch (e) { return s.textContent.trim(); }
  });

  // Schema.org types referenced inline (microdata)
  const microdata = Array.from(document.querySelectorAll("[itemtype]"))
    .map((el) => el.getAttribute("itemtype"))
    .filter(Boolean);

  return {
    url: location.href,
    title: text(document.querySelector("title")),
    description: metaName("description"),
    keywords: metaName("keywords"),
    canonical,
    robots,
    noindex,
    viewport: metaName("viewport"),
    charset: (document.characterSet || ""),
    lang: document.documentElement.getAttribute("lang") || "",
    author: metaName("author"),
    headings,
    headingCounts,
    imgTotal: imgs.length,
    imgsNoAlt,
    linkInternal: internal,
    linkExternal: external,
    linkNofollow: nofollow,
    linkList,
    hreflang,
    wordCount,
    og,
    twitter,
    jsonLd,
    microdata,
  };
}

/* ------------------------------------------------------------------ *
 * Popup controller                                                    *
 * ------------------------------------------------------------------ */
let seoData = null;
let activeTab = "overview";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function lenClass(len, min, max) {
  if (len === 0) return "len-bad";
  if (len < min || len > max) return "len-warn";
  return "len-good";
}

function fieldRow(label, value, opts) {
  opts = opts || {};
  const empty = !value;
  let badge = "";
  if (opts.lenCheck) {
    const len = value ? value.length : 0;
    badge = `<span class="meta-len ${lenClass(len, opts.min, opts.max)}">${len} chars</span>`;
  }
  const valHtml = empty
    ? `<div class="field-value empty">Not found</div>`
    : `<div class="field-value">${opts.link ? `<a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a>` : esc(value)}</div>`;
  return `
    <div class="field">
      <div class="field-head"><span class="field-label">${esc(label)}</span>${badge}</div>
      ${valHtml}
    </div>`;
}

function renderOverview(d) {
  const index = d.noindex
    ? `<span class="badge bad">Noindex</span>`
    : `<span class="badge good">Indexable</span>`;

  return `
    ${fieldRow("Title", d.title, { lenCheck: true, min: 30, max: 60 })}
    ${fieldRow("Meta Description", d.description, { lenCheck: true, min: 70, max: 160 })}
    <div class="field">
      <div class="field-head"><span class="field-label">Indexability</span></div>
      <div class="field-value">${index}${d.robots ? ` <span class="muted">(robots: ${esc(d.robots)})</span>` : ""}</div>
    </div>
    ${fieldRow("Canonical URL", d.canonical, { link: true })}

    <div class="stat-grid">
      <div class="stat"><div class="stat-num">${d.wordCount}</div><div class="stat-label">Words</div></div>
      <div class="stat"><div class="stat-num ${d.headingCounts.h1 === 1 ? "good" : "bad"}">${d.headingCounts.h1}</div><div class="stat-label">H1 tags</div></div>
      <div class="stat"><div class="stat-num">${d.imgTotal}</div><div class="stat-label">Images</div></div>
      <div class="stat"><div class="stat-num ${d.imgsNoAlt > 0 ? "bad" : "good"}">${d.imgsNoAlt}</div><div class="stat-label">Images w/o alt</div></div>
      <div class="stat"><div class="stat-num">${d.linkInternal}</div><div class="stat-label">Internal links</div></div>
      <div class="stat"><div class="stat-num">${d.linkExternal}</div><div class="stat-label">External links</div></div>
    </div>

    ${fieldRow("Keywords", d.keywords)}
    ${fieldRow("Viewport", d.viewport)}
    ${fieldRow("Language", d.lang)}
    ${fieldRow("Charset", d.charset)}
    ${fieldRow("Author", d.author)}
    ${d.hreflang.length ? `
      <div class="section-title">Hreflang (${d.hreflang.length})</div>
      ${d.hreflang.map((h) => `<div class="link-item"><span class="link-tag">${esc(h.lang)}</span><a href="${esc(h.href)}" target="_blank" rel="noopener">${esc(h.href)}</a></div>`).join("")}
    ` : ""}
  `;
}

function renderHeadings(d) {
  if (!d.headings.length) return `<div class="state">No headings found on this page.</div>`;
  const counts = Object.entries(d.headingCounts)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join(" · ");
  return `
    <div class="muted" style="margin-bottom:10px;">${counts}</div>
    ${d.headings
      .map(
        (h) =>
          `<div class="heading-item h-lvl-${h.level}"><span class="heading-tag">H${h.level}</span><span>${esc(h.text) || "<em class='muted'>(empty)</em>"}</span></div>`
      )
      .join("")}
  `;
}

function renderSocial(d) {
  const og = d.og;
  const tw = d.twitter;
  const hasOg = Object.values(og).some(Boolean);
  const hasTw = Object.values(tw).some(Boolean);
  return `
    <div class="section-title">Open Graph ${hasOg ? "" : '<span class="muted">(none)</span>'}</div>
    ${fieldRow("og:title", og.title)}
    ${fieldRow("og:description", og.description)}
    ${fieldRow("og:type", og.type)}
    ${fieldRow("og:site_name", og.siteName)}
    ${fieldRow("og:url", og.url, { link: true })}
    ${fieldRow("og:image", og.image, { link: true })}
    ${og.image ? `<img class="preview-img" src="${esc(og.image)}" alt="og:image preview" />` : ""}

    <div class="section-title">Twitter Card ${hasTw ? "" : '<span class="muted">(none)</span>'}</div>
    ${fieldRow("twitter:card", tw.card)}
    ${fieldRow("twitter:title", tw.title)}
    ${fieldRow("twitter:description", tw.description)}
    ${fieldRow("twitter:site", tw.site)}
    ${fieldRow("twitter:image", tw.image, { link: true })}
    ${tw.image ? `<img class="preview-img" src="${esc(tw.image)}" alt="twitter:image preview" />` : ""}
  `;
}

function renderLinks(d) {
  if (!d.linkList.length) return `<div class="state">No links found on this page.</div>`;
  return `
    <div class="muted" style="margin-bottom:10px;">
      ${d.linkInternal} internal · ${d.linkExternal} external · ${d.linkNofollow} nofollow
      ${d.linkList.length >= 300 ? " (showing first 300)" : ""}
    </div>
    ${d.linkList
      .map(
        (l) =>
          `<div class="link-item"><a href="${esc(l.href)}" target="_blank" rel="noopener" title="${esc(l.text)}">${esc(l.text)}</a><span class="link-tag">${l.type}${l.nofollow ? " · nofollow" : ""}</span></div>`
      )
      .join("")}
  `;
}

function renderSchema(d) {
  let html = "";
  if (d.jsonLd.length) {
    html += `<div class="section-title">JSON-LD (${d.jsonLd.length})</div>`;
    html += d.jsonLd.map((j) => `<pre class="code">${esc(j)}</pre>`).join("");
  }
  if (d.microdata.length) {
    html += `<div class="section-title">Microdata itemtypes (${d.microdata.length})</div>`;
    html += d.microdata.map((m) => `<div class="link-item"><a href="${esc(m)}" target="_blank" rel="noopener">${esc(m)}</a></div>`).join("");
  }
  if (!html) return `<div class="state">No structured data (JSON-LD or microdata) found.</div>`;
  return html;
}

function render() {
  const content = document.getElementById("content");
  if (!seoData) return;
  let html = "";
  switch (activeTab) {
    case "overview": html = renderOverview(seoData); break;
    case "headings": html = renderHeadings(seoData); break;
    case "social":   html = renderSocial(seoData); break;
    case "links":    html = renderLinks(seoData); break;
    case "schema":   html = renderSchema(seoData); break;
  }
  content.innerHTML = html;
  content.scrollTop = 0;
}

function showMessage(msg) {
  document.getElementById("content").innerHTML = `<div class="state">${esc(msg)}</div>`;
}

async function analyze() {
  showMessage("Analyzing page…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) { showMessage("No active tab."); return; }
    const url = tab.url || "";
    if (/^(chrome|edge|about|chrome-extension|devtools):/i.test(url)) {
      showMessage("This page can't be analyzed (browser internal page).");
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSeoData,
    });
    if (!results || !results[0]) { showMessage("Could not read the page."); return; }
    seoData = results[0].result;
    document.getElementById("url-foot").textContent = seoData.url;
    render();
  } catch (e) {
    showMessage("Error: " + (e && e.message ? e.message : String(e)));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.dataset.tab;
      render();
    });
  });
  document.getElementById("refresh").addEventListener("click", analyze);
  analyze();
});
