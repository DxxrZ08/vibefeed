export const NEWS_CATEGORIES = [
  {
    key: 'all',
    label: 'All Signals',
    slug: '',
    apiCategory: 'general',
    description: 'The most important stories across every beat.',
  },
  {
    key: 'technology',
    label: 'Technology',
    slug: 'technology',
    apiCategory: 'technology',
    description: 'AI, software, hardware, startups, and product shifts.',
  },
  {
    key: 'business',
    label: 'Business',
    slug: 'business',
    apiCategory: 'business',
    description: 'Markets, companies, money, policy, and macro signals.',
  },
  {
    key: 'science',
    label: 'Science',
    slug: 'science',
    apiCategory: 'science',
    description: 'Research, climate, space, medicine, and discoveries.',
  },
  {
    key: 'health',
    label: 'Health',
    slug: 'health',
    apiCategory: 'health',
    description: 'Medicine, wellness, public health, and biotech.',
  },
  {
    key: 'sports',
    label: 'Sports',
    slug: 'sports',
    apiCategory: 'sports',
    description: 'Matches, leagues, athlete momentum, and major events.',
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    slug: 'entertainment',
    apiCategory: 'entertainment',
    description: 'Film, TV, creators, music, and culture shifts.',
  },
  {
    key: 'general',
    label: 'World',
    slug: 'world',
    apiCategory: 'general',
    description: 'Politics, society, international affairs, and daily headlines.',
  },
];

export const NEWS_REGIONS = [
  { value: 'us', label: 'United States', flag: 'US' },
  { value: 'gb', label: 'United Kingdom', flag: 'UK' },
  { value: 'in', label: 'India', flag: 'IN' },
  { value: 'au', label: 'Australia', flag: 'AU' },
  { value: 'ca', label: 'Canada', flag: 'CA' },
  { value: 'fr', label: 'France', flag: 'FR' },
  { value: 'de', label: 'Germany', flag: 'DE' },
  { value: 'it', label: 'Italy', flag: 'IT' },
  { value: 'jp', label: 'Japan', flag: 'JP' },
  { value: 'br', label: 'Brazil', flag: 'BR' },
  { value: 'mx', label: 'Mexico', flag: 'MX' },
  { value: 'za', label: 'South Africa', flag: 'ZA' },
  { value: 'sg', label: 'Singapore', flag: 'SG' },
  { value: 'ae', label: 'United Arab Emirates', flag: 'AE' },
];

export const REGION_PACKS = {
  us: ['us', 'gb', 'in'],
  gb: ['gb', 'us', 'de'],
  in: ['in', 'sg', 'us'],
  au: ['au', 'gb', 'sg'],
  ca: ['ca', 'us', 'gb'],
  fr: ['fr', 'de', 'gb'],
  de: ['de', 'fr', 'gb'],
  it: ['it', 'fr', 'de'],
  jp: ['jp', 'sg', 'us'],
  br: ['br', 'mx', 'us'],
  mx: ['mx', 'us', 'br'],
  za: ['za', 'gb', 'ae'],
  sg: ['sg', 'in', 'jp'],
  ae: ['ae', 'gb', 'in'],
};

export const getCategoryByKey = (key = 'all') =>
  NEWS_CATEGORIES.find((category) => category.key === key) || NEWS_CATEGORIES[0];

export const getCategoryBySlug = (slug = '') =>
  NEWS_CATEGORIES.find((category) => category.slug === slug) || NEWS_CATEGORIES[0];

export const getRegionByValue = (value = 'us') =>
  NEWS_REGIONS.find((region) => region.value === value) || NEWS_REGIONS[0];
