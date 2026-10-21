// Injects strings from src/content.js into index.html at build/dev time.
// Syntax in index.html:  {{ path.to.value }}   e.g. {{ hero.title.1 }}
// Values are HTML-escaped; only <em>…</em> survives (tiny sanitiser).
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function sanitize(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/&lt;(\/?)em&gt;/g, '<$1em>');
}

export function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function inject(html, content) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, path) => {
    const v = get(content, path);
    if (v === undefined) throw new Error(`[build-content] missing key: ${path}`);
    return sanitize(v);
  });
}

export async function loadContent(root) {
  const file = pathToFileURL(resolve(root, 'src/content.js')).href + `?t=${Date.now()}`;
  return (await import(file)).content;
}

/** Vite plugin */
export default function contentPlugin() {
  let root = process.cwd();
  return {
    name: 'iept-content',
    configResolved(cfg) {
      root = cfg.root;
    },
    async transformIndexHtml(html) {
      return inject(html, await loadContent(root));
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('content.js')) server.ws.send({ type: 'full-reload' });
    },
  };
}
