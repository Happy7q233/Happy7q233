export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    let key = decodeURIComponent(url.pathname.slice(1))
    if (!key) key = "index.html"

    const object = await env.files.get(key)

    if (!object) {
      return Response.redirect(
        "https://links.happy7q233.net/error-files",
        302
      )
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set("etag", object.httpEtag)

    return new Response(object.body, { headers })
  }
}
