// <plexe-autosuggest>: a hotel and destination search box for the Plexe Autosuggest API.
//
//   <script type="module" src="https://suggest.plexe.ai/widget/v1.js"></script>
//   <plexe-autosuggest api-key="plx_..." placeholder="Where to?"></plexe-autosuggest>
//
// Use a website key from the console (https://suggest.plexe.ai/console): it answers only
// requests from the sites listed on it, so it is safe in page code.
//
// It follows the API's integration checklist: the first keystroke goes at once and later
// ones are debounced, a new request cancels the last, matches are bold, places listed
// under the first result are indented, and each pick is reported to /api/suggest/select
// (not counted towards your plan; the no-telemetry attribute turns it off).
//
// Events (they bubble out of the shadow root):
//   plexe-select  detail: the chosen suggestion, as the API returns it
//   plexe-error   detail: { status, message }
//
// No dependencies. Safe to import during server rendering: it defines the element only
// in a browser.

const TYPE_LABELS = {
  city: "City", neighborhood: "Area", point_of_interest: "Landmark", airport: "Airport",
  hotel: "Hotel", island: "Island", region: "Region", country: "Country", metro_area: "Metro area",
};

const STYLE = `
  :host { display: block; position: relative; font: var(--plexe-font, 15px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif);
    --_bg: var(--plexe-bg, #fff); --_fg: var(--plexe-fg, #111827); --_muted: var(--plexe-muted, #6b7280);
    --_border: var(--plexe-border, #d1d5db); --_accent: var(--plexe-accent, #4f46e5); --_active: var(--plexe-active-bg, #eef2ff);
    --_radius: var(--plexe-radius, 8px); }
  :host([theme="dark"]) { --_bg: var(--plexe-bg, #111113); --_fg: var(--plexe-fg, #ededef); --_muted: var(--plexe-muted, #8b8d98);
    --_border: var(--plexe-border, #2e2e35); --_accent: var(--plexe-accent, #8b7cf6); --_active: var(--plexe-active-bg, #1f1d2e); }
  @media (prefers-color-scheme: dark) {
    :host([theme="auto"]) { --_bg: var(--plexe-bg, #111113); --_fg: var(--plexe-fg, #ededef); --_muted: var(--plexe-muted, #8b8d98);
      --_border: var(--plexe-border, #2e2e35); --_accent: var(--plexe-accent, #8b7cf6); --_active: var(--plexe-active-bg, #1f1d2e); }
  }
  [hidden] { display: none !important; }
  input { box-sizing: border-box; width: 100%; height: var(--plexe-height, 44px); padding: 0 12px; font: inherit; color: var(--_fg);
    background: var(--_bg); border: 1px solid var(--_border); border-radius: var(--_radius); outline: none; }
  input:focus { border-color: var(--_accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--_accent) 20%, transparent); }
  ul { position: absolute; z-index: var(--plexe-z, 1000); left: 0; right: 0; top: calc(100% + 4px); margin: 0; padding: 4px; list-style: none;
    background: var(--_bg); border: 1px solid var(--_border); border-radius: var(--_radius); box-shadow: 0 8px 24px rgba(0,0,0,.12);
    max-height: var(--plexe-max-height, 360px); overflow-y: auto; }
  li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: calc(var(--_radius) - 2px); cursor: pointer; color: var(--_fg); }
  li[aria-selected="true"] { background: var(--_active); }
  li.child { padding-left: 26px; }
  .txt { min-width: 0; flex: 1; }
  .name, .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { color: var(--_muted); font-size: .85em; }
  mark { background: none; color: inherit; font-weight: 600; }
  .type { flex: none; color: var(--_muted); font-size: .75em; border: 1px solid var(--_border); border-radius: 4px; padding: 1px 6px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

const Base = typeof HTMLElement === "undefined" ? class {} : HTMLElement;
let seq = 0;

export class PlexeAutosuggest extends Base {
  static formAssociated = true;
  static get observedAttributes() { return ["placeholder", "disabled", "value"]; }

  constructor() {
    super();
    const id = `plexe-as-${++seq}`;
    this._root = this.attachShadow({ mode: "open" });
    this._root.innerHTML = `<style>${STYLE}</style>
      <input part="input" type="text" role="combobox" autocomplete="off" spellcheck="false"
             aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list">
      <ul part="list" id="${id}-list" role="listbox" hidden></ul>
      <div class="sr" aria-live="polite"></div>`;
    this._id = id;
    this._input = this._root.querySelector("input");
    this._list = this._root.querySelector("ul");
    this._status = this._root.querySelector(".sr");
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._results = [];
    this._active = -1;
    this._cache = new Map();
    this._timer = 0;
    this._ctrl = null;
    this._session = null;
    this._keystrokes = 0;
    this._last = 0;
    this._selected = null;

    this._input.addEventListener("input", () => this._schedule());
    this._input.addEventListener("keydown", (e) => this._key(e));
    this._input.addEventListener("focus", () => { if (this._results.length && this._input.value) this._open(true); });
    this._input.addEventListener("blur", () => this._open(false));
    // pointerdown keeps focus in the input, so blur does not close the list before the click lands
    this._list.addEventListener("pointerdown", (e) => e.preventDefault());
    this._list.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (li) this._choose(Number(li.dataset.i));
    });
  }

  connectedCallback() {
    this._sync("placeholder");
    this._sync("disabled");
    if (this.hasAttribute("value")) this._input.value = this.getAttribute("value");
    const label = this.getAttribute("aria-label") || this.getAttribute("placeholder") || "Search destinations and hotels";
    this._input.setAttribute("aria-label", label);
  }

  attributeChangedCallback(name) {
    if (name === "value") this._input.value = this.getAttribute("value") || "";
    else this._sync(name);
  }

  _sync(name) {
    if (name === "placeholder") this._input.placeholder = this.getAttribute("placeholder") || "City, area, landmark, airport or hotel";
    if (name === "disabled") this._input.disabled = this.hasAttribute("disabled");
  }

  // ---------------- public API
  get value() { return this._input.value; }
  set value(v) { this._input.value = v ?? ""; }
  /** The suggestion last chosen, or null. */
  get selected() { return this._selected; }
  focus(opts) { this._input.focus(opts); }
  clear() {
    this._input.value = ""; this._selected = null; this._results = [];
    this._internals?.setFormValue(null); this._render();
  }

  // ---------------- settings, read when used
  get _endpoint() { return (this.getAttribute("endpoint") || "https://suggest.plexe.ai").replace(/\/+$/, ""); }
  _num(name, dflt, lo, hi) {
    const n = Number(this.getAttribute(name));
    return Number.isFinite(n) && this.hasAttribute(name) ? Math.min(hi, Math.max(lo, n)) : dflt;
  }

  // ---------------- typing
  _schedule() {
    clearTimeout(this._timer);
    this._selected = null;
    this._internals?.setFormValue(null);
    const q = this._input.value.trim();
    if (q.length < this._num("min-chars", 1, 1, 10)) {
      this._ctrl?.abort();
      this._results = []; this._render();
      return;
    }
    if (!this._session) {
      this._session = (crypto.randomUUID?.() || String(Math.random()).slice(2)).replace(/-/g, "").slice(0, 32);
      this._keystrokes = 0;
    }
    this._keystrokes += 1;
    // the first keystroke after a pause goes at once; a burst of typing waits for a gap
    const wait = this._num("debounce", 120, 0, 2000);
    const now = Date.now();
    const go = () => { this._last = Date.now(); this._fetch(q); };
    if (now - this._last >= wait) go();
    else this._timer = setTimeout(go, wait);
  }

  async _fetch(q) {
    const params = new URLSearchParams({ q, limit: String(this._num("limit", 8, 1, 20)) });
    for (const name of ["types", "country", "lat", "lon"]) {
      const v = this.getAttribute(name);
      if (v) params.set(name, v);
    }
    params.set("session_id", this._session);
    const url = `${this._endpoint}/api/suggest?${params}`;
    if (this._cache.has(url)) return this._show(q, this._cache.get(url));
    this._ctrl?.abort();
    const ctrl = (this._ctrl = new AbortController());
    try {
      const headers = {};
      const key = this.getAttribute("api-key");
      if (key) headers["X-API-Key"] = key;
      const r = await fetch(url, { headers, signal: ctrl.signal });
      if (!r.ok) {
        let message = r.statusText;
        try { message = (await r.json()).detail || message; } catch {}
        throw Object.assign(new Error(message), { status: r.status });
      }
      const body = await r.json();
      if (this._cache.size > 100) this._cache.delete(this._cache.keys().next().value);
      this._cache.set(url, body.results || []);
      this._show(q, body.results || []);
    } catch (e) {
      if (e.name === "AbortError") return;
      this._emit("plexe-error", { status: e.status || 0, message: e.message });
    }
  }

  _show(q, results) {
    if (this._input.value.trim() !== q) return;          // the user typed on; a newer request is coming
    this._results = results;
    this._lastQuery = q;
    this._active = -1;
    this._render();
  }

  // ---------------- the list
  _render() {
    const list = this._list;
    list.textContent = "";
    this._results.forEach((r, i) => {
      const li = document.createElement("li");
      li.id = `${this._id}-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("part", r.child_of ? "option child" : "option");
      if (r.child_of) li.className = "child";
      li.setAttribute("aria-selected", String(i === this._active));
      li.dataset.i = String(i);
      const txt = document.createElement("div");
      txt.className = "txt";
      const name = document.createElement("div");
      name.className = "name";
      name.append(...highlight(r.name || "", r.highlight));
      const sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent = subtitle(r);
      txt.append(name, sub);
      const type = document.createElement("span");
      type.className = "type";
      type.setAttribute("part", "type");
      type.textContent = TYPE_LABELS[r.type] || String(r.type || "").replace(/_/g, " ");
      li.append(txt, type);
      list.append(li);
    });
    this._status.textContent = this._input.value.trim()
      ? (this._results.length ? `${this._results.length} suggestions` : "No suggestions") : "";
    this._open(this._results.length > 0 && this._input === this._root.activeElement);
    this._mark();
  }

  _open(on) {
    this._list.hidden = !on;
    this._input.setAttribute("aria-expanded", String(on));
    if (!on) { this._active = -1; this._mark(); }
  }

  _mark() {
    [...this._list.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === this._active)));
    if (this._active >= 0) {
      const li = this._list.children[this._active];
      this._input.setAttribute("aria-activedescendant", li.id);
      li.scrollIntoView?.({ block: "nearest" });
    } else {
      this._input.removeAttribute("aria-activedescendant");
    }
  }

  _key(e) {
    if (e.isComposing) return;
    const n = this._results.length;
    const open = !this._list.hidden;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!n) return;
      e.preventDefault();
      if (!open) { this._open(true); }
      const step = e.key === "ArrowDown" ? 1 : -1;
      this._active = this._active < 0 ? (step > 0 ? 0 : n - 1) : (this._active + step + n) % n;
      this._mark();
    } else if (e.key === "Enter") {
      if (open && this._active >= 0) { e.preventDefault(); this._choose(this._active); }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); this._open(false); }
    }
  }

  _choose(i) {
    const r = this._results[i];
    if (!r) return;
    this._selected = r;
    this._input.value = r.name;
    this._internals?.setFormValue(r.id);
    this._open(false);
    this._report(r, i);
    this._session = null;                     // the next search is a new session
    this._emit("plexe-select", r);
  }

  // which suggestion was picked, at which position: how ranking is tuned (not billed)
  _report(r, i) {
    if (this.hasAttribute("no-telemetry")) return;
    const body = { session_id: this._session, q: this._lastQuery || r.name, id: r.id, type: r.type,
                   position: i, shown: Math.max(1, Math.min(20, this._results.length)), keystrokes: this._keystrokes };
    const country = this.getAttribute("country");
    if (country) body.country = country;
    const headers = { "Content-Type": "application/json" };
    const key = this.getAttribute("api-key");
    if (key) headers["X-API-Key"] = key;
    fetch(`${this._endpoint}/api/suggest/select`, { method: "POST", headers, body: JSON.stringify(body), keepalive: true })
      .catch(() => {});
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

// the name with the matched parts in <mark>; ranges are [start, end) offsets into the name
function highlight(text, ranges) {
  const out = [];
  let at = 0;
  for (const [s, e] of (ranges || []).slice().sort((a, b) => a[0] - b[0])) {
    if (s < at || e <= s || e > text.length) continue;
    if (s > at) out.push(document.createTextNode(text.slice(at, s)));
    const m = document.createElement("mark");
    m.setAttribute("part", "match");
    m.textContent = text.slice(s, e);
    out.push(m);
    at = e;
  }
  if (at < text.length) out.push(document.createTextNode(text.slice(at)));
  return out;
}

// the line under the name: where it is, and for a place how many hotels it has
function subtitle(r) {
  let where = r.label || "";
  if (r.name && where.startsWith(r.name + ", ")) where = where.slice(r.name.length + 2);
  else if (where === r.name) where = "";
  if (r.type !== "hotel" && r.hotel_count > 0) {
    const n = `${r.hotel_count.toLocaleString("en")} hotel${r.hotel_count === 1 ? "" : "s"}`;
    where = where ? `${where} · ${n}` : n;
  }
  return where;
}

if (typeof customElements !== "undefined" && !customElements.get("plexe-autosuggest")) {
  customElements.define("plexe-autosuggest", PlexeAutosuggest);
}
