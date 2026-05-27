/**
 * HN Unified SDK — سطر واحد لربط أي موقع بـ hn-bd.online
 *
 * الاستعمال:
 *   <script src="https://hn-bd.online/hn.js"
 *           data-key="dbg_xxxxxxxxxxxx"
 *           data-app="my-site-key"></script>
 *
 * يُنشئ window.HN = { db, storage, auth, user, ready }
 */
(function () {
  var script = document.currentScript;
  var BASE = (script && script.getAttribute("data-base")) || "https://hn-bd.online";
  var API_KEY = (script && script.getAttribute("data-key")) || "";
  var APP_KEY = (script && script.getAttribute("data-app")) || "";
  var STORAGE = "hn_sso";

  if (!API_KEY) {
    console.error("[HN] data-key is required on the <script> tag.");
    return;
  }

  // ---------- helpers ----------
  function endpoint(p) { return BASE.replace(/\/$/, "") + p; }
  function jsonHeaders() {
    return { "Content-Type": "application/json", "X-HN-Api-Key": API_KEY };
  }
  function keyHeaders() { return { "X-HN-Api-Key": API_KEY }; }
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
        headers: keyHeaders(),
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
        method: "DELETE", headers: keyHeaders(),
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
        headers: keyHeaders(),
      }).then(function (r) { return r.json(); });
    },
    remove: function (key) {
      return fetch(endpoint("/api/public/v1/storage?key=" + encodeURIComponent(key)), {
        method: "DELETE", headers: keyHeaders(),
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
        + "?app=" + encodeURIComponent(APP_KEY || location.host)
        + "&redirect=" + encodeURIComponent(opts.returnTo || location.href);
      location.href = url;
    },
    signup: function (opts) {
      opts = opts || {};
      var url = endpoint("/signup")
        + "?app=" + encodeURIComponent(APP_KEY || location.host)
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
    apiKey: API_KEY,
    appKey: APP_KEY,
    baseUrl: BASE,
  };

  // ---------- Capture SSO ticket on return ----------
  var params = new URLSearchParams(location.search);
  var ticket = params.get("hn_ticket");
  if (ticket) {
    fetch(endpoint("/api/public/sso/verify"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: ticket, app_key: APP_KEY || location.host }),
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
