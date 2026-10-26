import { useEffect } from 'react';

const SITE_NAME = 'Veidne';
const BASE_URL = 'https://veidne.com';
const DEFAULT_DESCRIPTION = 'Create personalized documents from templates.';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

interface PageSeoProps {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  noindex?: boolean;
}

function setMeta(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function PageSeo({ title, description, path, ogImage, noindex }: PageSeoProps) {
  const desc = description || DEFAULT_DESCRIPTION;
  const safePath = path || '/';
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Document Template Engine`;
  const canonicalUrl = `${BASE_URL}${safePath}`;
  const image = ogImage || DEFAULT_OG_IMAGE;

  useEffect(() => {
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setLink('canonical', canonicalUrl);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', image);

    let robotsEl = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (noindex) {
      if (!robotsEl) {
        robotsEl = document.createElement('meta');
        robotsEl.setAttribute('name', 'robots');
        document.head.appendChild(robotsEl);
      }
      robotsEl.setAttribute('content', 'noindex,nofollow');
    } else if (robotsEl) {
      robotsEl.remove();
    }
  }, [fullTitle, desc, canonicalUrl, image, noindex]);

  return null;
}
