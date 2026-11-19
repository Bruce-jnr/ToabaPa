export const isMarketingSite = import.meta.env.MODE === 'marketing';

const appOrigin = import.meta.env.VITE_APP_URL;
const marketingOrigin = import.meta.env.VITE_MARKETING_URL;

if (!appOrigin || !marketingOrigin) {
  throw new Error('Set VITE_APP_URL and VITE_MARKETING_URL in the frontend environment.');
}

function join(origin, path) {
  return `${origin.replace(/\/$/, '')}${path}`;
}

export const appHref = (path) => join(appOrigin, path);
export const marketingHref = (path) => join(marketingOrigin, path);
export const eventHref = (slug) => isMarketingSite ? appHref(`/events/${slug}`) : `/events/${slug}`;
export const publicPageHref = (path) => isMarketingSite ? path : marketingHref(path);

export function publicImageUrl(path) {
  if (!path || !isMarketingSite || !path.startsWith('/api/')) return path;
  const apiOrigin = import.meta.env.VITE_PUBLIC_API_URL;
  if (!apiOrigin) throw new Error('Set VITE_PUBLIC_API_URL for the marketing site.');
  return join(apiOrigin, path);
}
