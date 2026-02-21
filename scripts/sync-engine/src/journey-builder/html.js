export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].trim()).slice(0, 200) : '';
}

export function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  if (!match) return '';
  const tag = match[0];
  const contentMatch = tag.match(/content=["']([^"']*)["']/i);
  return contentMatch ? decodeEntities(contentMatch[1].trim()).slice(0, 400) : '';
}

export function extractInternalLinks(html, baseUrl) {
  const links = new Set();
  const hrefRegex = /href=["']([^"'#\s>]+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1];
    const normalized = normalizeHref(raw, baseUrl);
    if (normalized) links.add(normalized);
  }
  return Array.from(links);
}

export function htmlToText(html) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutTags)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHref(href, baseUrl) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('sms:')) return null;
  if (trimmed.startsWith('javascript:')) return null;
  if (/\.(png|jpe?g|gif|webp|svg|pdf|zip|xml)(\?.*)?$/i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    const cleaned = url.toString();
    return cleaned;
  } catch {
    return null;
  }
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
