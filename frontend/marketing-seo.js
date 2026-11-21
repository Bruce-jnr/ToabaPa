export const marketingPages = {
  '/': [
    'Toabapa | Online Voting for Events in Ghana',
    'Discover live events and learn how online voting works with Toabapa.',
  ],
  '/events': [
    'Explore Voting Events | Toabapa',
    'Browse live, upcoming, and ended events on Toabapa.',
  ],
  '/how-it-works': [
    'How Online Voting Works | Toabapa',
    'Learn how organizers create events and how supporters cast verified votes on Toabapa.',
  ],
  '/contact': [
    'Contact Toabapa',
    'Get in touch with Toabapa support by phone, WhatsApp, or email.',
  ],
  '/privacy': [
    'Privacy Policy | Toabapa',
    'Read how Toabapa handles personal data for voting and event services.',
  ],
  '/terms': [
    'Terms and Conditions | Toabapa',
    'Read the terms for using Toabapa voting and event services.',
  ],
};

export function marketingSitemap(origin) {
  const urls = Object.keys(marketingPages)
    .map((route) => `  <url><loc>${origin}${route}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function marketingRobots(origin) {
  return `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
}
