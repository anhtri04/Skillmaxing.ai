export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove hash fragments
    urlObj.hash = '';
    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch {
    return url;
  }
}
