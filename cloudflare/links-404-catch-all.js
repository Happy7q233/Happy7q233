export default {
  async fetch(request) {
    const response = await fetch(request)
    
    // If the page is not found (404), serve homepage content instead
    if (response.status === 404) {
      const homepageResponse = await fetch("https://links.happy7q233.net/error-links")
      return homepageResponse
    }

    return response
  }
}
