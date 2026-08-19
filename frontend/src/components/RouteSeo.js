import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import routeMetadata from '../seo/route-metadata.json';
import homeSchema from '../seo/home-schema.json';

const normalizePath = (path) => {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
};

const noindexMetadata = (title, path) => ({
  title,
  description: 'This page is not intended for search results.',
  canonical: null,
  robots: 'noindex,nofollow',
  path,
  indexable: false,
});

export const resolveRouteMetadata = (pathname) => {
  const path = normalizePath(pathname);
  const exact = routeMetadata.routes.find((route) => route.path === path);
  if (exact) return exact;

  if (path.startsWith('/staff/')) {
    return noindexMetadata('Staff Portal | Santa Cruz Strength', path);
  }

  if (path.startsWith('/review/')) {
    return noindexMetadata('Review Request | Santa Cruz Strength', path);
  }

  return noindexMetadata('Page Not Found | Santa Cruz Strength', path);
};

const upsertMeta = (attribute, key, value) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
};

const updateCanonical = (canonical) => {
  const canonicalLinks = [...document.head.querySelectorAll('link[rel="canonical"]')];
  if (!canonical) {
    canonicalLinks.forEach((link) => link.remove());
    return;
  }

  const primary = canonicalLinks[0] || document.createElement('link');
  primary.setAttribute('rel', 'canonical');
  primary.setAttribute('href', canonical);
  if (!primary.parentNode) document.head.appendChild(primary);
  canonicalLinks.slice(1).forEach((link) => link.remove());
};

const updateSchema = (pathname) => {
  // Blog posts are served with prerendered article schema in their head shell.
  // A client-side navigation away from one must drop it, or the stale block
  // keeps describing the previous article.
  if (!pathname.startsWith('/blog/')) {
    document.getElementById('article-schema')?.remove();
  }

  const existing = document.getElementById('site-schema');
  if (pathname !== '/') {
    existing?.remove();
    return;
  }

  const script = existing || document.createElement('script');
  script.id = 'site-schema';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(homeSchema);
  if (!script.parentNode) document.head.appendChild(script);
};

export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = resolveRouteMetadata(pathname);
    document.title = metadata.title;
    upsertMeta('name', 'description', metadata.description);
    upsertMeta('name', 'robots', metadata.robots || routeMetadata.site.defaultRobots);
    upsertMeta('property', 'og:title', metadata.title);
    upsertMeta('property', 'og:description', metadata.description);
    upsertMeta('property', 'og:url', metadata.canonical || window.location.href);
    upsertMeta('property', 'og:type', metadata.path?.startsWith('/blog/') ? 'article' : 'website');
    upsertMeta('name', 'twitter:title', metadata.title);
    upsertMeta('name', 'twitter:description', metadata.description);
    updateCanonical(metadata.canonical);
    updateSchema(normalizePath(pathname));
  }, [pathname]);

  return null;
}
