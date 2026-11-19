// Fictional interface examples. These never represent hosted events or results.
const examples = [
  [
    'community-arts-awards',
    'GALA Excellence Awards',
    'Arts & Culture Collective',
    ['Visual Artist', 'Spoken Word', 'Community Theatre', 'Public Art'],
  ],
  [
    'rising-voices-music-showcase',
    'Rising Voices Music Showcase',
    'Rising Voices Studio',
    [
      'Vocal Performance',
      'Original Song',
      'Stage Presence',
      'Newcomer',
      'Live Band',
    ],
  ],
  [
    'campus-creators-festival',
    'Campus Creators Festival',
    'Campus Creators Network',
    [
      'Design',
      'Short Film',
      'Photography',
      'Writing',
      'Animation',
      'Digital Art',
    ],
  ],
  [
    'NKZ Face of SHS',
    'NKZ Face of SHS',
    'Heritage Arts Circle',
    [
      'Solo Dance',
      'Group Dance',
      'Choreography',
      'Traditional Dance',
      'Contemporary Dance',
      'Costume Design',
      'Audience Choice',
    ],
  ],
  [
    'young-innovators-honours',
    'Young Innovators Honours',
    'Innovation Circle',
    [
      'Social Impact',
      'Digital Product',
      'Emerging Founder',
      'Research',
      'Sustainability',
      'Education',
      'Health Innovation',
      'Community Solution',
    ],
  ],
  [
    'neighbourhood-heroes-awards',
    'Neighbourhood Heroes Awards',
    'Community Impact Forum',
    [
      'Volunteer',
      'Mentor',
      'Local Initiative',
      'Youth Leader',
      'Community Care',
      'Environment',
      'Public Service',
      'Neighbourhood Project',
      'Audience Choice',
    ],
  ],
  [
    'new-faces-pageant',
    'New Faces Pageant',
    'New Faces Collective',
    ['Talent', 'Style', 'Community Project', 'Confidence'],
  ],
  [
    'makers-and-designers-prizes',
    'Makers & Designers Prizes',
    'Makers Guild',
    [
      'Fashion Design',
      'Craft',
      'Product Design',
      'Textile Art',
      'Emerging Maker',
    ],
  ],
  [
    'local-sports-honours',
    'Local Sports Honours',
    'Community Sports Forum',
    [
      'Team Spirit',
      'Breakthrough Athlete',
      'Coach',
      'Captain',
      'Fair Play',
      'Community Club',
    ],
  ],
  [
    'screen-and-stage-showcase',
    'Screen & Stage Showcase',
    'Creative Stage Network',
    [
      'Short Film',
      'Performance',
      'Audience Choice',
      'Direction',
      'Writing',
      'Production',
      'New Talent',
    ],
  ],
];

const bannerFiles = [
  'awards-gala.jpg',
  'music-night.jpg',
  'campus.jpg',
  'pageant-green.jpg',
  'gold-podium.jpg',
  'award-night-green.jpg',
  'pageant-crown.jpg',
  'gold-podium.jpg',
  'award-night-green.jpg',
  'music-night.jpg',
];

export const demoEvents = examples.map(
  ([slug, name, organizer, categories], index) => ({
    id: `demo-${slug}`,
    slug,
    name,
    organization: { name: organizer },
    publicStatus: 'ended',
    isDemo: true,
    startAt: `2025-${String(Math.floor(index / 2) + 2).padStart(2, '0')}-01T12:00:00.000Z`,
    endAt: `2025-${String(Math.floor(index / 2) + 2).padStart(2, '0')}-28T12:00:00.000Z`,
    bannerUrl: `/demo-banners/${bannerFiles[index]}`,
    _count: { candidates: 0 },
    categories: categories.map((category, categoryIndex) => ({
      id: `demo-${slug}-${categoryIndex}`,
      slug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: category,
    })),
  }),
);

export function getDemoEvent(slug) {
  return demoEvents.find((event) => event.slug === slug);
}

export function filterDemoEvents(status, search) {
  if (status !== 'all' && status !== 'ended') return [];
  const query = search.trim().toLowerCase();
  return demoEvents.filter(
    (event) =>
      !query ||
      [
        event.name,
        event.organization.name,
        ...event.categories.map((category) => category.name),
      ].some((value) => value.toLowerCase().includes(query)),
  );
}
