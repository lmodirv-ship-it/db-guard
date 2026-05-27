/**
 * HN SDK — single-line integration for any external site.
 *
 *   <script src="https://hn-bd.online/hn.js" data-site="site-slug"></script>
 *
 * Exposes window.HN = { auth, db, storage, users, permissions, analytics, ready }
 * All calls authenticate with an opaque bearer token (hns_…) stored in localStorage.
 *
 * Independent of Supabase. Talks to /api/hn/* and /api/public/config.
 */
(function () {
  var script = document.currentScript;
  var BASE = (script && script.getAttribute("data-base")) || "https://hn-bd.online";
  var SITE_SLUG = (script && script.getAttribute("data-site")) || "";
  var TOKEN_KEY = "hn_token";
  var USER_KEY = "hn_user";

  if (!SITE_SLUG) {
    console.error("[HN] data-site is required on the <script> tag.");
    return;
  }

  // ---------- helpers ----------
  function ep(p) { return BASE.replace(/\/$/, "") + p; }
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || null; } catch (_) { return null; } }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else   localStorage.removeItem(TOKEN_KEY);
    } catch (_) {}
  }
  function setUser(u) {
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else   localStorage.removeItem(USER_KEY);
    } catch (_) {}
    HN.user = u || null;
  }
  function loadUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch (_) { return null; }
  }
  function headers(extra) {
    var h = { "X-HN-Site": SITE_SLUG };
    var t = getToken();
    if (t) h["Authorization"] = "Bearer " + t;
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function jsonHeaders() { return headers({ "Content-Type": "application/json" }); }

  // ---------- offline queue (for non-critical writes) ----------
  var QUEUE_KEY = "hn_queue";
  function loadQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (_) { return []; } }
  function saveQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (_) {} }
  function enqueue(req) {
    var q = loadQueue(); q.push(req); saveQueue(q);
  }
  function drainQueue() {
    if (!navigator.onLine) return;
    var q = loadQueue();
    if (!q.length) return;
    saveQueue([]);
    q.forEach(function (r) {
      fetch(ep(r.path), { method: r.method, headers: jsonHeaders(), body: r.body }).catch(function () { enqueue(r); });
    });
  }
  window.addEventListener("online", drainQueue);

  // ---------- core request with retry ----------
  function request(path, opts) {
    opts = opts || {};
    var init = {
      method: opts.method || "GET",
      headers: opts.json ? jsonHeaders() : headers(opts.headers),
    };
    if (opts.body !== undefined) init.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    var attempt = 0;
    function go() {
      attempt++;
      return fetch(ep(path), init).then(function (r) {
        if (r.status === 401) { setToken(null); setUser(null); }
        return r.json().catch(function () { return { ok: false, error: "non_json", status: r.status }; });
      }).catch(function (e) {
        if (attempt < 3 && navigator.onLine) {
          return new Promise(function (res) { setTimeout(res, 300 * attempt); }).then(go);
        }
        return { ok: false, error: "network_error", message: String(e) };
      });
    }
    return go();
  }

  // ---------- HN.auth ----------
  var auth = {
    signup: function (email, password, name) {
      return request("/api/hn/auth/signup", {
        method: "POST", json: true,
        body: { email: email, password: password, name: name, site: SITE_SLUG },
      }).then(function (r) {
        if (r && r.ok && r.token) { setToken(r.token); setUser(r.user); }
        return r;
      });
    },
    login: function (email, password) {
      return request("/api/hn/auth/login", {
        method: "POST", json: true,
        body: { email: email, password: password, site: SITE_SLUG },
      }).then(function (r) {
        if (r && r.ok && r.token) { setToken(r.token); setUser(r.user); }
        return r;
      });
    },
    logout: function () {
      return request("/api/hn/auth/logout", { method: "POST" }).finally(function () {
        setToken(null); setUser(null);
      });
    },
    me: function () {
      if (!getToken()) return Promise.resolve(null);
      return request("/api/hn/auth/me").then(function (r) {
        if (r && r.ok) setUser(r.user);
        return r;
      });
    },
    token: getToken,
  };

  // ---------- HN.db ----------
  var db = {
    list: function (collection, opts) {
      opts = opts || {};
      var qs = "?limit=" + (opts.limit || 50) + "&offset=" + (opts.offset || 0);
      return request("/api/hn/db/" + encodeURIComponent(collection) + "/" + qs);
    },
    insert: function (collection, data) {
      var path = "/api/hn/db/" + encodeURIComponent(collection) + "/";
      if (!navigator.onLine) {
        enqueue({ path: path, method: "POST", body: JSON.stringify({ data: data }) });
        return Promise.resolve({ ok: true, queued: true });
      }
      return request(path, { method: "POST", json: true, body: { data: data } });
    },
    update: function (collection, id, data) {
      return request(
        "/api/hn/db/" + encodeURIComponent(collection) + "/" + encodeURIComponent(id),
        { method: "PATCH", json: true, body: { data: data } },
      );
    },
    delete: function (collection, id) {
      return request(
        "/api/hn/db/" + encodeURIComponent(collection) + "/" + encodeURIComponent(id),
        { method: "DELETE" },
      );
    },
  };

  // ---------- HN.storage ----------
  function readAsB64(file) {
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
  var storage = {
    upload: function (file, opts) {
      opts = opts || {};
      return readAsB64(file).then(function (b64) {
        return request("/api/hn/storage/", {
          method: "POST", json: true,
          body: {
            fileName: opts.fileName || file.name,
            contentType: opts.contentType || file.type || "application/octet-stream",
            dataBase64: b64,
          },
        });
      });
    },
    list: function (opts) {
      opts = opts || {};
      return request("/api/hn/storage/?limit=" + (opts.limit || 50));
    },
    delete: function (id) {
      return request("/api/hn/storage/" + encodeURIComponent(id), { method: "DELETE" });
    },
    url: function (id) {
      return ep("/api/hn/storage/" + encodeURIComponent(id));
    },
  };

  // ---------- HN.permissions ----------
  var permissions = {
    list: function () { return request("/api/hn/roles"); },
    has: function (code) {
      return auth.me().then(function (r) {
        return !!(r && r.ok && r.permissions && r.permissions.indexOf(code) >= 0);
      });
    },
  };

  // ---------- HN.users (current only — admin endpoints arrive separately) ----------
  var users = { me: auth.me };

  // ---------- HN.analytics (lightweight beacon) ----------
  var analytics = {
    track: function (event, props) {
      try {
        var body = JSON.stringify({ event: event, props: props || {}, ts: Date.now(), site: SITE_SLUG });
        if (navigator.sendBeacon) navigator.sendBeacon(ep("/api/public/analytics"), body);
        else fetch(ep("/api/public/analytics"), { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
      } catch (_) {}
    },
  };

  // ---------- expose + boot ----------
  window.HN = {
    auth: auth, db: db, storage: storage,
    users: users, permissions: permissions, analytics: analytics,
    site: SITE_SLUG, baseUrl: BASE,
    user: loadUser(),
    config: null,
    ready: null,
    version: "2.0.0",
  };

  HN.ready = fetch(ep("/api/public/config?site=" + encodeURIComponent(SITE_SLUG)))
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.ok) { console.error("[HN] config failed:", j && j.error); return null; }
      HN.config = j.site;
      window.dispatchEvent(new CustomEvent("hn:ready", { detail: j.site }));
      // refresh /me silently if we have a token
      if (getToken()) auth.me();
      drainQueue();
      return j.site;
    })
    .catch(function (e) { console.error("[HN] connect error:", e); return null; });
})();
