(function (global) {
  function readAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function init(opts) {
    var apiKey = (opts && opts.apiKey) || "";
    var baseUrl = (opts && opts.baseUrl) || "https://hn-bd.online";
    var siteHost = (opts && opts.siteHost) || "";
    if (!apiKey) throw new Error("HNStorage: apiKey is required");

    function endpoint(path) {
      return baseUrl.replace(/\/$/, "") + path;
    }

    function fileUrl(key) {
      return endpoint("/api/public/v1/storage/file?key=" + encodeURIComponent(key));
    }

    async function upload(file, opts) {
      opts = opts || {};
      var dataBase64 = await readAsBase64(file);
      var res = await fetch(endpoint("/api/public/v1/storage"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HN-Api-Key": apiKey,
        },
        body: JSON.stringify({
          fileName: opts.fileName || file.name,
          contentType: opts.contentType || file.type || "application/octet-stream",
          dataBase64: dataBase64,
          siteHost: opts.siteHost || siteHost || undefined,
          visibility: opts.visibility || "private",
        }),
      });
      return res.json();
    }

    async function list(opts) {
      opts = opts || {};
      var params = new URLSearchParams();
      if (opts.limit) params.set("limit", String(opts.limit));
      if (opts.siteHost || siteHost) params.set("siteHost", opts.siteHost || siteHost);
      var res = await fetch(endpoint("/api/public/v1/storage?" + params.toString()), {
        headers: { "X-HN-Api-Key": apiKey },
      });
      return res.json();
    }

    async function remove(key) {
      var res = await fetch(endpoint("/api/public/v1/storage?key=" + encodeURIComponent(key)), {
        method: "DELETE",
        headers: { "X-HN-Api-Key": apiKey },
      });
      return res.json();
    }

    return { upload: upload, list: list, remove: remove, fileUrl: fileUrl };
  }

  global.HNStorage = { init: init };
})(typeof window !== "undefined" ? window : globalThis);
