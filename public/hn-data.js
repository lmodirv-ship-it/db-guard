/**
 * HN-DATA — Mini SDK لمواقع hn-groupe
 * استعمال:
 *   <script src="https://hn-bd.online/hn-data.js"></script>
 *   <script>
 *     const db = HNData.init({ apiKey: 'dbg_xxx', baseUrl: 'https://hn-bd.online' });
 *     await db.insert('posts', { title: 'Hello', body: '...' });
 *     const { items } = await db.list('posts', { limit: 20 });
 *     await db.remove('posts', id);
 *   </script>
 */
(function (global) {
  function init(opts) {
    const apiKey = (opts && opts.apiKey) || '';
    const baseUrl = (opts && opts.baseUrl) || 'https://hn-bd.online';
    if (!apiKey) throw new Error('HNData: apiKey is required');

    const headers = {
      'Content-Type': 'application/json',
      'X-HN-Api-Key': apiKey,
    };

    function url(collection, qs) {
      const u = baseUrl.replace(/\/$/, '') + '/api/public/v1/data/' + encodeURIComponent(collection);
      if (!qs) return u;
      const p = new URLSearchParams(qs);
      return u + '?' + p.toString();
    }

    async function list(collection, opts) {
      opts = opts || {};
      const res = await fetch(url(collection, { limit: opts.limit || 50, offset: opts.offset || 0 }), {
        method: 'GET',
        headers: { 'X-HN-Api-Key': apiKey },
      });
      return res.json();
    }

    async function insert(collection, data) {
      const res = await fetch(url(collection), {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: data || {} }),
      });
      return res.json();
    }

    async function remove(collection, id) {
      const res = await fetch(url(collection, { id }), {
        method: 'DELETE',
        headers: { 'X-HN-Api-Key': apiKey },
      });
      return res.json();
    }

    return { list, insert, remove };
  }

  global.HNData = { init };
})(typeof window !== 'undefined' ? window : globalThis);
