import { extractInternalLinks, extractMetaDescription, extractTitle, htmlToText } from './html.js';

test('extractTitle returns title text', () => {
  const html = '<html><head><title> Hello World </title></head><body></body></html>';
  expect(extractTitle(html)).toBe('Hello World');
});

test('extractMetaDescription returns description content', () => {
  const html = '<meta name="description" content="A description here.">';
  expect(extractMetaDescription(html)).toBe('A description here.');
});

test('extractInternalLinks returns normalized internal links and filters assets', () => {
  const html = `
    <a href="/wedding-venue">Venue</a>
    <a href="https://example.com/ok">Ok</a>
    <a href="https://example.com/file.pdf">PDF</a>
    <a href="/feed.xml">Feed</a>
    <a href="mailto:test@example.com">Mail</a>
  `;
  const links = extractInternalLinks(html, 'https://example.com/');
  expect(links).toContain('https://example.com/wedding-venue');
  expect(links).toContain('https://example.com/ok');
  expect(links).not.toContain('https://example.com/file.pdf');
  expect(links).not.toContain('https://example.com/feed.xml');
});

test('htmlToText strips scripts/styles and collapses whitespace', () => {
  const html = `
    <html>
      <head>
        <style>body{color:red}</style>
        <script>console.log("x")</script>
      </head>
      <body><h1>Hello</h1><p>World</p></body>
    </html>
  `;
  expect(htmlToText(html)).toBe('Hello World');
});

