export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) return htmlPage("Please enter provided key.");

    // === RATE LIMIT BY IP ===
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateLimitKey = `rate_ip_${ip}`;
    const now = Date.now();
    const windowMs = 300 * 1000; // cooldown in seconds
    const maxRequests = 10;

    let rateData = await env.RATE_LIMIT.get(rateLimitKey, { type: "json" });
    if (!rateData) {
      rateData = { count: 1, start: now };
    } else {
      if (now - rateData.start < windowMs) {
        if (rateData.count >= maxRequests) {
          return htmlPage(
            `Too many attempts; Try again in ${Math.ceil((windowMs - (now - rateData.start)) / 1000)} second(s).`,
            429
          );
        }
        rateData.count++;
      } else {
        // window expired
        rateData = { count: 1, start: now };
      }
    }

    await env.RATE_LIMIT.put(rateLimitKey, JSON.stringify(rateData), { expirationTtl: 60 });

    // === CHECK KEY IN DOWNLOAD_KEYS ===
    const entryJson = await env.DOWNLOAD_KEYS.get(key);
    if (!entryJson) return htmlPage("Invalid key. Please try again.");

    const entry = JSON.parse(entryJson);

    if (entry.type === "download") {
      const object = await env.R2_BUCKET.get(entry.file);
      if (!object) return new Response("File not found", { status: 404 });

      return new Response(object.body, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(entry.file)}`
        }
      });
    }

    if (entry.type === "redirect") {
      return Response.redirect(entry.url, 302);
    }

    return htmlPage("Unknown entry type.", 400);
  }
};

// === AUTH HTML PAGE ===
function htmlPage(error, status = 200) {
  return new Response(`
  <html>
  <head>
    <link href="https://fonts.googleapis.com/css2?family=WDXL+Lubrifont+SC&display=swap" rel="stylesheet">
    <style>
    body {
      font-family: "WDXL Lubrifont SC", system-ui, sans-serif;
      background-color: #1a1a1a;
      color: white;
      text-align: center;
      margin-top: 100px;
      font-size: 20px; /* <- bigger default text */
    }
    input, button { 
      padding: 12px 16px; 
      font-size: 18px; /* <- bigger input/button text */
    }
    button {
      margin-left: 10px; 
      cursor: pointer;
      background-color: #4CAF50; 
      color: white;
      border: none; 
      border-radius: 5px;
    }
    button:hover { 
      background-color: #45a049; 
    }
    .error { 
      color: #ff6b6b; 
      margin-bottom: 10px; 
      font-size: 20px; /* <- bigger error text */
    }
    h2 {
      font-size: 40px; /* <- bigger heading */
    }    
    </style>
  </head>
  <body>
    <h2>Authorisation</h2>
    ${error ? `<div class="error">${error}</div>` : ""}
    <input id="key" placeholder="Enter Key">
    <button onclick="go()">Auth</button>
    <script>
      function go(){
        const k=document.getElementById('key').value;
        if(k) location.search='?key='+encodeURIComponent(k);
      }
    </script>
  </body>
</html>
  `, { 
    status: status,
    headers: { "Content-Type": "text/html" } 
  });
}
