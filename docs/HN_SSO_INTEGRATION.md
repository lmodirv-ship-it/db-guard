# HN SSO Integration (Identity Gateway)

DB-GUARD is the central Identity Provider for the HN ecosystem
(`HN Chat`, `HN Groupe`, `HN Driver`, `HN Souk`, …). Any HN application
delegates user authentication to DB-GUARD and receives a signed JWT back.

---

## 1. Flow overview

```
[App Site]  ──redirect──>  [DB-GUARD /sso/authorize]
                                 │
                          (login if needed)
                                 │
                       issue short-lived ticket (60s)
                                 │
[App Site] <──redirect with ?hn_ticket=…&hn_app=… ──
       │
       │  POST /api/public/sso/verify  { ticket, app_key }
       ▼
   { ok, user, jwt, expires_in }
```

- Ticket TTL: **60 seconds**, single-use.
- App JWT TTL: **24 hours** (HS256, signed with `HN_JWT_SECRET`).
- The same user identity (`hn_user_code`) is shared across every HN app.

---

## 2. Register your app (Owner only)

Add a row in the `connected_apps` table:

| column                    | example                               |
| ------------------------- | ------------------------------------- |
| `app_key`                 | `chat`                                |
| `name`                    | `HN Chat`                             |
| `allowed_redirect_hosts`  | `["*.hnchat.net", "localhost"]`       |
| `status`                  | `active`                              |

Wildcard hosts (`*.example.com`) match the base domain and any subdomain.

---

## 3. Client-side SDK snippet

Drop this in any HN site (works in any framework):

```html
<script>
(function () {
  var IDP = "https://db-guard.lovable.app"; // central IdP
  var APP_KEY = "chat";                     // your app_key

  window.HN = {
    login: function (returnTo) {
      var redirect = location.origin + "/sso/return"; // your callback page
      var url = IDP + "/sso/authorize"
        + "?app=" + encodeURIComponent(APP_KEY)
        + "&redirect=" + encodeURIComponent(redirect)
        + (returnTo ? "&state=" + encodeURIComponent(returnTo) : "");
      location.href = url;
    },

    // Call this on /sso/return with the URL query params.
    handleReturn: async function () {
      var p = new URLSearchParams(location.search);
      var ticket = p.get("hn_ticket");
      if (!ticket) return null;
      var res = await fetch(IDP + "/api/public/sso/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: ticket, app_key: APP_KEY }),
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || "sso_failed");
      localStorage.setItem("hn_jwt", data.jwt);
      localStorage.setItem("hn_user", JSON.stringify(data.user));
      return data;
    },

    logout: function () {
      localStorage.removeItem("hn_jwt");
      localStorage.removeItem("hn_user");
    },

    user: function () {
      try { return JSON.parse(localStorage.getItem("hn_user") || "null"); }
      catch (_) { return null; }
    },

    token: function () { return localStorage.getItem("hn_jwt"); },
  };
})();
</script>
```

Usage:

```js
// Login button
HN.login();

// On /sso/return
HN.handleReturn().then(function (s) {
  if (s) location.href = "/dashboard";
});

// Authenticated fetch
fetch("/api/whatever", {
  headers: { Authorization: "Bearer " + HN.token() }
});
```

---

## 4. Verifying the JWT on your backend

Every HN app shares the same JWT signing secret `HN_JWT_SECRET`. Verify with
HS256, issuer `smart-generator`, audience `smart-generator-app`. The payload
contains `sub` (HN user id) and `email`.

```ts
import { jwtVerify } from "jose";
const key = new TextEncoder().encode(process.env.HN_JWT_SECRET);
const { payload } = await jwtVerify(token, key, {
  issuer: "smart-generator",
  audience: "smart-generator-app",
});
// payload.sub  -> HN user id
// payload.email -> email
```

---

## 5. Forgot password

Direct users to:

```
https://db-guard.lovable.app/forgot-password
```

Reset works via 6-digit OTP sent by email. The same hn_user_code or email is
accepted.

---

## 6. Active sessions

Each user can review and revoke devices at:

```
https://db-guard.lovable.app/account/sessions
```

Sessions track device, IP, user-agent, last-active timestamp, and expire
after 30 days unless revoked.
