export interface PlatformDefinition {
  id: string;
  name: string;
  category: 'Streaming' | 'Email' | 'Social' | 'Productividad' | 'Gaming' | 'Finanzas' | 'IA' | 'Otros';
  domain: string;
  bgColor?: string;
  iconSlug?: string;
}

export const PLATFORMS: PlatformDefinition[] = [
  // --- STREAMING & ENTRETENIMIENTO ---
  { id: 'netflix', name: 'Netflix', category: 'Streaming', domain: 'netflix.com', iconSlug: 'netflix', bgColor: '#141414' },
  { id: 'disney', name: 'Disney+', category: 'Streaming', domain: 'disneyplus.com', iconSlug: 'disneyplus', bgColor: '#040714' },
  { id: 'spotify', name: 'Spotify', category: 'Streaming', domain: 'spotify.com', iconSlug: 'spotify', bgColor: '#121212' },
  { id: 'hbo', name: 'Max / HBO Max', category: 'Streaming', domain: 'max.com', iconSlug: 'hbo', bgColor: '#000000' },
  { id: 'primevideo', name: 'Amazon Prime Video', category: 'Streaming', domain: 'primevideo.com', iconSlug: 'primevideo', bgColor: '#0f172a' },
  { id: 'youtube', name: 'YouTube', category: 'Streaming', domain: 'youtube.com', iconSlug: 'youtube', bgColor: '#181818' },
  { id: 'twitch', name: 'Twitch', category: 'Streaming', domain: 'twitch.tv', iconSlug: 'twitch', bgColor: '#18181b' },
  { id: 'appletv', name: 'Apple TV+', category: 'Streaming', domain: 'tv.apple.com', iconSlug: 'apple', bgColor: '#000000' },
  { id: 'crunchyroll', name: 'Crunchyroll', category: 'Streaming', domain: 'crunchyroll.com', iconSlug: 'crunchyroll', bgColor: '#141519' },
  { id: 'paramount', name: 'Paramount+', category: 'Streaming', domain: 'paramountplus.com', iconSlug: 'paramountplus', bgColor: '#001a38' },
  { id: 'deezer', name: 'Deezer', category: 'Streaming', domain: 'deezer.com', iconSlug: 'deezer', bgColor: '#121216' },
  { id: 'tidal', name: 'Tidal', category: 'Streaming', domain: 'tidal.com', iconSlug: 'tidal', bgColor: '#000000' },

  // --- EMAIL & CUENTAS ---
  { id: 'gmail', name: 'Google / Gmail', category: 'Email', domain: 'gmail.com', iconSlug: 'gmail', bgColor: '#1e293b' },
  { id: 'outlook', name: 'Microsoft Outlook / Hotmail', category: 'Email', domain: 'outlook.com', iconSlug: 'microsoftoutlook', bgColor: '#0f172a' },
  { id: 'apple', name: 'Apple / iCloud', category: 'Email', domain: 'icloud.com', iconSlug: 'apple', bgColor: '#000000' },
  { id: 'proton', name: 'Proton Mail', category: 'Email', domain: 'proton.me', iconSlug: 'protonmail', bgColor: '#17142b' },
  { id: 'yahoo', name: 'Yahoo Mail', category: 'Email', domain: 'yahoo.com', iconSlug: 'yahoo', bgColor: '#1a103c' },

  // --- REDES SOCIALES & MENSAJERÍA ---
  { id: 'instagram', name: 'Instagram', category: 'Social', domain: 'instagram.com', iconSlug: 'instagram', bgColor: '#18181b' },
  { id: 'x', name: 'X (Twitter)', category: 'Social', domain: 'x.com', iconSlug: 'x', bgColor: '#000000' },
  { id: 'whatsapp', name: 'WhatsApp', category: 'Social', domain: 'whatsapp.com', iconSlug: 'whatsapp', bgColor: '#0b141a' },
  { id: 'telegram', name: 'Telegram', category: 'Social', domain: 'telegram.org', iconSlug: 'telegram', bgColor: '#0f172a' },
  { id: 'discord', name: 'Discord', category: 'Social', domain: 'discord.com', iconSlug: 'discord', bgColor: '#1e1f22' },
  { id: 'facebook', name: 'Facebook', category: 'Social', domain: 'facebook.com', iconSlug: 'facebook', bgColor: '#0f172a' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Social', domain: 'linkedin.com', iconSlug: 'linkedin', bgColor: '#0f172a' },
  { id: 'tiktok', name: 'TikTok', category: 'Social', domain: 'tiktok.com', iconSlug: 'tiktok', bgColor: '#000000' },
  { id: 'reddit', name: 'Reddit', category: 'Social', domain: 'reddit.com', iconSlug: 'reddit', bgColor: '#18181b' },
  { id: 'pinterest', name: 'Pinterest', category: 'Social', domain: 'pinterest.com', iconSlug: 'pinterest', bgColor: '#18181b' },

  // --- INTELIGENCIA ARTIFICIAL ---
  { id: 'openai', name: 'OpenAI / ChatGPT', category: 'IA', domain: 'chatgpt.com', iconSlug: 'openai', bgColor: '#102820' },
  { id: 'anthropic', name: 'Anthropic / Claude', category: 'IA', domain: 'claude.ai', iconSlug: 'anthropic', bgColor: '#231c19' },
  { id: 'perplexity', name: 'Perplexity AI', category: 'IA', domain: 'perplexity.ai', iconSlug: 'perplexity', bgColor: '#0f2027' },
  { id: 'midjourney', name: 'Midjourney', category: 'IA', domain: 'midjourney.com', iconSlug: 'midjourney', bgColor: '#000000' },

  // --- PRODUCTIVIDAD & DESARROLLO ---
  { id: 'github', name: 'GitHub', category: 'Productividad', domain: 'github.com', iconSlug: 'github', bgColor: '#0d1117' },
  { id: 'gitlab', name: 'GitLab', category: 'Productividad', domain: 'gitlab.com', iconSlug: 'gitlab', bgColor: '#18141f' },
  { id: 'notion', name: 'Notion', category: 'Productividad', domain: 'notion.so', iconSlug: 'notion', bgColor: '#191919' },
  { id: 'slack', name: 'Slack', category: 'Productividad', domain: 'slack.com', iconSlug: 'slack', bgColor: '#1a1d21' },
  { id: 'figma', name: 'Figma', category: 'Productividad', domain: 'figma.com', iconSlug: 'figma', bgColor: '#1e1e1e' },
  { id: 'dropbox', name: 'Dropbox', category: 'Productividad', domain: 'dropbox.com', iconSlug: 'dropbox', bgColor: '#0f172a' },
  { id: 'trello', name: 'Trello', category: 'Productividad', domain: 'trello.com', iconSlug: 'trello', bgColor: '#0f172a' },
  { id: 'asana', name: 'Asana', category: 'Productividad', domain: 'asana.com', iconSlug: 'asana', bgColor: '#1e1b2e' },
  { id: 'zoom', name: 'Zoom', category: 'Productividad', domain: 'zoom.us', iconSlug: 'zoom', bgColor: '#0f172a' },
  { id: 'vercel', name: 'Vercel', category: 'Productividad', domain: 'vercel.com', iconSlug: 'vercel', bgColor: '#000000' },
  { id: 'supabase', name: 'Supabase', category: 'Productividad', domain: 'supabase.com', iconSlug: 'supabase', bgColor: '#17221d' },
  { id: 'aws', name: 'AWS (Amazon Web Services)', category: 'Productividad', domain: 'aws.amazon.com', iconSlug: 'amazonaws', bgColor: '#1e293b' },

  // --- GAMING ---
  { id: 'steam', name: 'Steam', category: 'Gaming', domain: 'steampowered.com', iconSlug: 'steam', bgColor: '#171a21' },
  { id: 'playstation', name: 'PlayStation Network', category: 'Gaming', domain: 'playstation.com', iconSlug: 'playstation', bgColor: '#001a44' },
  { id: 'xbox', name: 'Xbox / Microsoft Gaming', category: 'Gaming', domain: 'xbox.com', iconSlug: 'xbox', bgColor: '#0d2812' },
  { id: 'nintendo', name: 'Nintendo Account', category: 'Gaming', domain: 'nintendo.com', iconSlug: 'nintendo', bgColor: '#2e0b0e' },
  { id: 'epicgames', name: 'Epic Games', category: 'Gaming', domain: 'epicgames.com', iconSlug: 'epicgames', bgColor: '#121212' },
  { id: 'riotgames', name: 'Riot Games (Valorant / LoL)', category: 'Gaming', domain: 'riotgames.com', iconSlug: 'riotgames', bgColor: '#241014' },
  { id: 'ubisoft', name: 'Ubisoft Connect', category: 'Gaming', domain: 'ubisoft.com', iconSlug: 'ubisoft', bgColor: '#0a1628' },
  { id: 'ea', name: 'Electronic Arts (EA)', category: 'Gaming', domain: 'ea.com', iconSlug: 'ea', bgColor: '#1f1315' },

  // --- FINANZAS & SHOPPING ---
  { id: 'mercadolibre', name: 'Mercado Libre / Pago', category: 'Finanzas', domain: 'mercadolibre.com', iconSlug: 'mercadopago', bgColor: '#1e2430' },
  { id: 'paypal', name: 'PayPal', category: 'Finanzas', domain: 'paypal.com', iconSlug: 'paypal', bgColor: '#0a1931' },
  { id: 'stripe', name: 'Stripe', category: 'Finanzas', domain: 'stripe.com', iconSlug: 'stripe', bgColor: '#15142b' },
  { id: 'binance', name: 'Binance', category: 'Finanzas', domain: 'binance.com', iconSlug: 'binance', bgColor: '#241f10' },
  { id: 'coinbase', name: 'Coinbase', category: 'Finanzas', domain: 'coinbase.com', iconSlug: 'coinbase', bgColor: '#0c1a3b' },
  { id: 'wise', name: 'Wise (TransferWise)', category: 'Finanzas', domain: 'wise.com', iconSlug: 'wise', bgColor: '#132412' },
  { id: 'revolut', name: 'Revolut', category: 'Finanzas', domain: 'revolut.com', iconSlug: 'revolut', bgColor: '#121212' },
  { id: 'amazon', name: 'Amazon Store', category: 'Finanzas', domain: 'amazon.com', iconSlug: 'amazon', bgColor: '#1e293b' },
  { id: 'ebay', name: 'eBay', category: 'Finanzas', domain: 'ebay.com', iconSlug: 'ebay', bgColor: '#22181a' },
  { id: 'uber', name: 'Uber / Uber Eats', category: 'Finanzas', domain: 'uber.com', iconSlug: 'uber', bgColor: '#121212' },
  { id: 'airbnb', name: 'Airbnb', category: 'Finanzas', domain: 'airbnb.com', iconSlug: 'airbnb', bgColor: '#281318' },
];

/**
 * Returns crisp, high-resolution official icon URL.
 * Uses Google Favicons HD 128px (which brings full-color native brand logos)
 * or SimpleIcons with clean colored vector rendering.
 */
export function getPlatformLogoUrl(domainOrSlug?: string): string {
  if (!domainOrSlug) return '';

  let cleanDomain = domainOrSlug.trim();
  if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
    cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').split('/')[0];
  }

  // Google 128px high-res favicon brings the official full-color platform icon
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
}

/**
 * Secondary vector fallback using SimpleIcons.
 */
export function getSimpleIconUrl(slug?: string): string {
  if (!slug) return '';
  return `https://cdn.simpleicons.org/${slug}/white`;
}

/**
 * Finds matching platform by name, keyword or domain.
 */
export function findPlatformByNameOrDomain(input?: string): PlatformDefinition | undefined {
  if (!input) return undefined;
  const query = input.toLowerCase().trim();

  return PLATFORMS.find((p) => {
    if (p.name.toLowerCase() === query) return true;
    if (p.id.toLowerCase() === query) return true;
    if (p.name.toLowerCase().includes(query) || query.includes(p.name.toLowerCase())) return true;
    if (p.domain.toLowerCase().includes(query) || query.includes(p.domain.toLowerCase())) return true;
    return false;
  });
}
