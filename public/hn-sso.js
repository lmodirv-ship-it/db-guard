/**
 * HN SSO Client — drop this on any HN-affiliated site (hn-db.fun, otobo, etc.)
 * Usage:
 *   <script src="/hn-sso.js" data-app-key="hn-db-fun"></script>
 *
 * On page load:
 *   1. If URL contains ?hn_ticket=..., POST to https://hn-bd.online/api/public/sso/verify
 *      and store { session_token, user } in localStorage under key "hn_sso".
 *   2. Removes hn_ticket from the URL.
 *   3. Exposes window.HN = { user, session_token, signIn(), signOut(), me() }.
 */
(function () {
  var ENDPOINT = "https://hn-db.fun";
  var script = document.currentScript;
  var APP_KEY = (script && script.getAttribute("data-app-key")) || "";
  var STORAGE = "hn_sso";

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "null"); } catch (_) { return null; }
  }
  function save(v) { localStorage.setItem(STORAGE, JSON.stringify(v)); }
  function clear() { localStorage.removeItem(STORAGE); }

  var state = load();
  window.HN = {
    user: state && state.user,
    session_token: state && state.session_token,
    signIn: function (mode) {
      var url = ENDPOINT + "/" + (mode === "signup" ? "signup" : "login") +
        "?app=" + encodeURIComponent(APP_KEY) +
        "&redirect=" + encodeURIComponent(window.location.origin + window.location.pathname);
      window.location.href = url;
    },
    signOut: function () { clear(); window.HN.user = null; window.HN.session_token = null; },
    me: function () {
      if (!window.HN.session_token) return Promise.resolve(null);
      return fetch(ENDPOINT + "/api/public/sso/me", {
        headers: { Authorization: "Bearer " + window.HN.session_token }
      }).then(function (r) { return r.json(); });
    }
  };

  // Capture ticket on return
  var params = new URLSearchParams(window.location.search);
  var ticket = params.get("hn_ticket");
  if (ticket && APP_KEY) {
    fetch(ENDPOINT + "/api/public/sso/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: ticket, app_key: APP_KEY })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) {
        save({ user: j.user, session_token: j.session_token, expires_at: j.expires_at });
        window.HN.user = j.user;
        window.HN.session_token = j.session_token;
        // strip ticket from URL
        params.delete("hn_ticket");
        var q = params.toString();
        var clean = window.location.pathname + (q ? "?" + q : "") + window.location.hash;
        window.history.replaceState({}, "", clean);
        window.dispatchEvent(new CustomEvent("hn:signin", { detail: j.user }));
      }
    }).catch(function () {});
  }
})();
