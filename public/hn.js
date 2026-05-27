/**
 * HN Connect — سطر واحد لربط أي موقع بـ hn-bd.online
 *
 * الاستعمال (الجديد، الموصى به):
 *   <script src="https://hn-bd.online/hn.js" data-site="hn-chat"></script>
 *
 * يقوم تلقائيًا بـ:
 *   1. جلب الإعدادات العامة من /api/public/config?site=hn-chat
 *   2. التحقق من أن دومين الموقع الحالي ضمن allowed_origins
 *   3. تهيئة HN.db و HN.storage و HN.auth بدون أي مفاتيح في المتصفح
 *
 * الإعدادات السرية (مفاتيح API) تبقى دائمًا على الخادم.
 *
 * (متوافق مع الطريقة القديمة data-key="dbg_…" للسيرفر-إلى-سيرفر فقط)
 */
(function () {
  var script = document.currentScript;
  var BASE = (script && script.getAttribute("data-base")) || "https://hn-bd.online";
  var SITE_SLUG = (script && script.getAttribute("data-site")) || "";
  var LEGACY_KEY = (script && script.getAttribute("data-key")) || "";
  var APP_KEY = (script && script.getAttribute("data-app")) || "";
  var STORAGE = "hn_sso";

  if (!SITE_SLUG && !LEGACY_KEY) {
    console.error("[HN] data-site (slug) is required on the <script> tag.");
    return;
  }

  // ---------- helpers ----------
  function endpoint(p) { return BASE.replace(/\/$/, "") + p; }
  function authHeaders(extra) {
    var h = extra || {};
    if (SITE_SLUG) h["X-HN-Site"] = SITE_SLUG;
    else if (LEGACY_KEY) h["X-HN-Api-Key"] = LEGACY_KEY;
    return h;
  }
  function jsonHeaders() { return authHeaders({ "Content-Type": "application/json" }); }
  function loadSso() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "null"); } catch (_) { return null; }
  }
  function saveSso(v) { localStorage.setItem(STORAGE, JSON.stringify(v)); }
  function clearSso() { localStorage.removeItem(STORAGE); }
  function readAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        var s = String(r.result || "");
        var i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ---------- DB ----------
  var db = {
    list: function (collection, opts) {
      opts = opts || {};
      var qs = new URLSearchParams({
        limit: String(opts.limit || 50),
        offset: String(opts.offset || 0),
      }).toString();
      return fetch(endpoint("/api/public/v1/data/" + encodeURIComponent(collection) + "?" + qs), {
        headers: authHeaders(),
      }).then(function (r) { return r.json(); });
    },
    insert: function (collection, data) {
      return fetch(endpoint("/api/public/v1/data/" + encodeURIComponent(collection)), {
        method: "POST", headers: jsonHeaders(),
        body: JSON.stringify({ data: data || {} }),
      }).then(function (r) { return r.json(); });
    },
    remove: function (collection, id) {
      return fetch(endpoint("/api/public/v1/data/" + encodeURIComponent(collection) + "?id=" + encodeURIComponent(id)), {
        method: "DELETE", headers: authHeaders(),
      }).then(function (r) { return r.json(); });
    },
  };

  // ---------- Storage ----------
  var storage = {
    upload: function (file, opts) {
      opts = opts || {};
      return readAsBase64(file).then(function (b64) {
        return fetch(endpoint("/api/public/v1/storage"), {
          method: "POST", headers: jsonHeaders(),
          body: JSON.stringify({
            fileName: opts.fileName || file.name,
            contentType: opts.contentType || file.type || "application/octet-stream",
            dataBase64: b64,
            siteHost: opts.siteHost || location.host,
            visibility: opts.visibility || "private",
          }),
        }).then(function (r) { return r.json(); });
      });
    },
    list: function (opts) {
      opts = opts || {};
      var p = new URLSearchParams();
      if (opts.limit) p.set("limit", String(opts.limit));
      p.set("siteHost", opts.siteHost || location.host);
      return fetch(endpoint("/api/public/v1/storage?" + p.toString()), {
        headers: authHeaders(),
      }).then(function (r) { return r.json(); });
    },
    remove: function (key) {
      return fetch(endpoint("/api/public/v1/storage?key=" + encodeURIComponent(key)), {
        method: "DELETE", headers: authHeaders(),
      }).then(function (r) { return r.json(); });
    },
    fileUrl: function (key) {
      return endpoint("/api/public/v1/storage/file?key=" + encodeURIComponent(key));
    },
  };

  // ---------- Auth / SSO ----------
  var state = loadSso();
  var auth = {
    user: state && state.user,
    session_token: state && state.session_token,
    login: function (opts) {
      opts = opts || {};
      var url = endpoint("/login")
        + "?app=" + encodeURIComponent(APP_KEY || SITE_SLUG || location.host)
        + "&redirect=" + encodeURIComponent(opts.returnTo || location.href);
      location.href = url;
    },
    signup: function (opts) {
      opts = opts || {};
      var url = endpoint("/signup")
        + "?app=" + encodeURIComponent(APP_KEY || SITE_SLUG || location.host)
        + "&redirect=" + encodeURIComponent(opts.returnTo || location.href);
      location.href = url;
    },
    logout: function () {
      clearSso();
      HN.auth.user = null;
      HN.auth.session_token = null;
      HN.user = null;
    },
    me: function () {
      if (!HN.auth.session_token) return Promise.resolve(null);
      return fetch(endpoint("/api/public/sso/me"), {
        headers: { Authorization: "Bearer " + HN.auth.session_token },
      }).then(function (r) { return r.json(); });
    },
  };

  // ---------- Expose ----------
  window.HN = {
    db: db,
    storage: storage,
    auth: auth,
    user: auth.user,
    site: SITE_SLUG,
    config: null,
    ready: null,
    baseUrl: BASE,
  };

  // ---------- HN Connect: fetch public config + validate origin ----------
  if (SITE_SLUG) {
    HN.ready = fetch(endpoint("/api/public/config?site=" + encodeURIComponent(SITE_SLUG)))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) {
          console.error("[HN] Connect failed:", (j && j.error) || "unknown");
          return null;
        }
        HN.config = j.site;
        if (!APP_KEY) APP_KEY = j.site.app_key || SITE_SLUG;
        // Optional client-side sanity check (the server has already validated Origin).
        var here = location.protocol + "//" + location.host;
        var origins = j.site.allowed_origins || [];
        var ok = origins.length === 0
          || origins.some(function (o) { return String(o).toLowerCase().replace(/\/$/, "") === here.toLowerCase(); })
          || here.indexOf("localhost") >= 0 || here.indexOf("127.0.0.1") >= 0;
        if (!ok) console.warn("[HN] current origin not in allowed list:", here, origins);
        window.dispatchEvent(new CustomEvent("hn:ready", { detail: j.site }));
        return j.site;
      })
      .catch(function (e) {
        console.error("[HN] Connect error:", e);
        return null;
      });
  } else {
    HN.ready = Promise.resolve(null);
  }

  // ---------- Capture SSO ticket on return ----------
  var params = new URLSearchParams(location.search);
  var ticket = params.get("hn_ticket");
  if (ticket) {
    fetch(endpoint("/api/public/sso/verify"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: ticket, app_key: APP_KEY || SITE_SLUG || location.host }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) {
        saveSso({ user: j.user, session_token: j.session_token, expires_at: j.expires_at });
        HN.auth.user = j.user;
        HN.auth.session_token = j.session_token;
        HN.user = j.user;
        params.delete("hn_ticket");
        var q = params.toString();
        history.replaceState({}, "", location.pathname + (q ? "?" + q : "") + location.hash);
        window.dispatchEvent(new CustomEvent("hn:signin", { detail: j.user }));
      }
    }).catch(function () {});
  }
})();
