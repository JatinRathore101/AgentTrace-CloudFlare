/* generate-docs runtime. Copy verbatim into <folder>/assets/docs.js. Do not edit per doc.
   Needs: window.DOCS (from assets/nav.js), <aside class="sidebar" id="sidebar">, <div class="topbar">.
   Provides: sidebar render + active item + filter, theme toggle, copy buttons, heading anchors,
   Mermaid diagrams (CDN, graceful fallback), mobile menu. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const here = decodeURIComponent(location.pathname.split("/").pop() || "home.html");

  /* ---------- theme ---------- */
  const root = document.documentElement;
  let stored = null; try { stored = localStorage.getItem("docs-theme"); } catch (e) {}
  if (stored === "dark" || stored === "light") root.setAttribute("data-theme", stored);
  const isDark = () => root.getAttribute("data-theme") === "dark" ||
    (!root.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
  function toggleTheme() {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("docs-theme", next); } catch (e) {}
    const b = $("#theme-btn"); if (b) b.textContent = next === "dark" ? "☀️" : "🌙";
    renderMermaid(true);
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    const sb = $("#sidebar"); if (!sb || !Array.isArray(window.DOCS)) return;
    const meta = window.DOCS_META || {};
    const groups = [];
    window.DOCS.forEach(d => {
      let g = groups.find(x => x.name === (d.group || "Docs"));
      if (!g) { g = { name: d.group || "Docs", items: [] }; groups.push(g); }
      g.items.push(d);
    });
    let html = `<div class="brand"><span>📁</span><div>${esc(meta.ticket || "Docs")}<small>${esc(meta.title || "")}</small></div></div>`;
    html += `<input class="filter" id="nav-filter" type="search" placeholder="Filter docs… (press /)" aria-label="Filter docs">`;
    groups.forEach(g => {
      html += `<div class="group">${esc(g.name)}</div>`;
      g.items.forEach(d => {
        const raw = !/\.html?$/i.test(d.file);
        const active = d.file === here ? " active" : "";
        html += `<a class="item${raw ? " raw" : ""}${active}" href="${encodeURI(d.file)}" data-title="${esc(d.title.toLowerCase())}"><span class="ico">${d.icon || (raw ? "📄" : "•")}</span><span>${esc(d.title)}</span></a>`;
      });
    });
    sb.innerHTML = html;
    const f = $("#nav-filter");
    f.addEventListener("input", () => {
      const q = f.value.trim().toLowerCase();
      $$("a.item", sb).forEach(a => a.classList.toggle("hidden", q && !a.dataset.title.includes(q) && !a.getAttribute("href").toLowerCase().includes(q)));
      $$(".group", sb).forEach(g => {
        let n = g.nextElementSibling, any = false;
        while (n && !n.classList.contains("group")) { if (!n.classList.contains("hidden")) any = true; n = n.nextElementSibling; }
        g.classList.toggle("hidden", !any);
      });
    });
    document.addEventListener("keydown", e => { if (e.key === "/" && document.activeElement !== f && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); f.focus(); } });
    const cur = window.DOCS.find(d => d.file === here);
    const crumbs = $("#crumbs"); if (crumbs && cur) crumbs.innerHTML = `${esc(meta.ticket || "")} / <b>${esc(cur.title)}</b>`;
    if (cur && !document.title) document.title = `${cur.title} · ${meta.ticket || ""}`;
  }

  /* ---------- copy buttons ---------- */
  function addCopyButtons() {
    $$("pre:not(.mermaid), .snippet").forEach(box => {
      if ($(".copy-btn", box)) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn"; btn.type = "button"; btn.textContent = "⧉ Copy"; btn.title = "Copy to clipboard";
      btn.addEventListener("click", async () => {
        const src = box.classList.contains("snippet") ? $(".text", box) : ($("code", box) || box);
        try { await navigator.clipboard.writeText(src.innerText.replace(/\n$/, "")); }
        catch (e) { const r = document.createRange(); r.selectNodeContents(src); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand("copy"); s.removeAllRanges(); }
        btn.textContent = "✓ Copied"; btn.classList.add("done");
        setTimeout(() => { btn.textContent = "⧉ Copy"; btn.classList.remove("done"); }, 1400);
      });
      box.appendChild(btn);
    });
    $$("[data-copy]").forEach(el => el.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(el.getAttribute("data-copy")); el.classList.add("done"); setTimeout(() => el.classList.remove("done"), 1400); } catch (e) {}
    }));
  }

  /* ---------- heading anchors ---------- */
  function addAnchors() {
    $$(".content h2, .content h3").forEach(h => {
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
      if (!$(".anchor", h)) { const a = document.createElement("a"); a.className = "anchor"; a.href = "#" + h.id; a.textContent = "#"; h.appendChild(a); }
    });
  }

  /* ---------- mermaid (CDN; falls back to showing source) ---------- */
  let mermaidLoaded = false;
  function renderMermaid(rerender) {
    const blocks = $$("pre.mermaid"); if (!blocks.length) return;
    blocks.forEach(b => { if (!b.dataset.src) b.dataset.src = b.textContent; });
    const run = () => {
      if (!window.mermaid) return;
      blocks.forEach(b => { b.removeAttribute("data-processed"); b.innerHTML = ""; b.textContent = b.dataset.src; });
      window.mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "default", securityLevel: "loose" });
      window.mermaid.run({ nodes: blocks }).catch(() => {});
    };
    if (mermaidLoaded) return run();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";
    s.onload = () => { mermaidLoaded = true; run(); };
    s.onerror = () => blocks.forEach(b => { b.setAttribute("data-title", "mermaid source (offline: diagram not rendered)"); });
    document.head.appendChild(s);
  }

  /* ---------- mobile menu ---------- */
  function wireChrome() {
    const m = $("#menu-btn"); const sb = $("#sidebar");
    if (m && sb) { m.addEventListener("click", () => sb.classList.toggle("open")); document.addEventListener("click", e => { if (sb.classList.contains("open") && !sb.contains(e.target) && e.target !== m) sb.classList.remove("open"); }); }
    const t = $("#theme-btn"); if (t) { t.textContent = isDark() ? "☀️" : "🌙"; t.addEventListener("click", toggleTheme); }
    const p = $("#print-btn"); if (p) p.addEventListener("click", () => print());
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  document.addEventListener("DOMContentLoaded", () => { renderSidebar(); wireChrome(); addAnchors(); addCopyButtons(); renderMermaid(false); });
})();
