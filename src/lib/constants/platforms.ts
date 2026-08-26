export interface PlatformDefinition {
  id: string;
  name: string;
  category: 'Streaming' | 'Email' | 'Social' | 'Productividad' | 'Gaming' | 'Finanzas' | 'IA' | 'Otros';
  domain: string;
  bgColor: string;
  textColor: string;
  iconSlug?: string; // SimpleIcons slug
}

export const PLATFORMS: PlatformDefinition[] = [
  // --- STREAMING & ENTRETENIMIENTO ---
  { id: 'netflix', name: 'Netflix', category: 'Streaming', domain: 'netflix.com', bgColor: '#E50914', textColor: '#FFFFFF', iconSlug: 'netflix' },
  { id: 'disney', name: 'Disney+', category: 'Streaming', domain: 'disneyplus.com', bgColor: '#002E72', textColor: '#FFFFFF', iconSlug: 'disneyplus' },
  { id: 'spotify', name: 'Spotify', category: 'Streaming', domain: 'spotify.com', bgColor: '#1DB954', textColor: '#000000', iconSlug: 'spotify' },
  { id: 'hbo', name: 'Max / HBO Max', category: 'Streaming', domain: 'max.com', bgColor: '#002BF7', textColor: '#FFFFFF', iconSlug: 'hbo' },
  { id: 'primevideo', name: 'Amazon Prime Video', category: 'Streaming', domain: 'primevideo.com', bgColor: '#00A8E1', textColor: '#FFFFFF', iconSlug: 'primevideo' },
  { id: 'youtube', name: 'YouTube', category: 'Streaming', domain: 'youtube.com', bgColor: '#FF0000', textColor: '#FFFFFF', iconSlug: 'youtube' },
  { id: 'twitch', name: 'Twitch', category: 'Streaming', domain: 'twitch.tv', bgColor: '#9146FF', textColor: '#FFFFFF', iconSlug: 'twitch' },
  { id: 'appletv', name: 'Apple TV+', category: 'Streaming', domain: 'tv.apple.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'appletv' },
  { id: 'crunchyroll', name: 'Crunchyroll', category: 'Streaming', domain: 'crunchyroll.com', bgColor: '#F47521', textColor: '#FFFFFF', iconSlug: 'crunchyroll' },
  { id: 'paramount', name: 'Paramount+', category: 'Streaming', domain: 'paramountplus.com', bgColor: '#0064FF', textColor: '#FFFFFF', iconSlug: 'paramountplus' },
  { id: 'deezer', name: 'Deezer', category: 'Streaming', domain: 'deezer.com', bgColor: '#FEAA2D', textColor: '#000000', iconSlug: 'deezer' },
  { id: 'tidal', name: 'Tidal', category: 'Streaming', domain: 'tidal.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'tidal' },

  // --- EMAIL & CUENTAS ---
  { id: 'gmail', name: 'Google / Gmail', category: 'Email', domain: 'google.com', bgColor: '#EA4335', textColor: '#FFFFFF', iconSlug: 'gmail' },
  { id: 'outlook', name: 'Microsoft Outlook / Hotmail', category: 'Email', domain: 'outlook.com', bgColor: '#0078D4', textColor: '#FFFFFF', iconSlug: 'microsoftoutlook' },
  { id: 'apple', name: 'Apple / iCloud', category: 'Email', domain: 'icloud.com', bgColor: '#333333', textColor: '#FFFFFF', iconSlug: 'apple' },
  { id: 'proton', name: 'Proton Mail', category: 'Email', domain: 'proton.me', bgColor: '#6D4AFF', textColor: '#FFFFFF', iconSlug: 'protonmail' },
  { id: 'yahoo', name: 'Yahoo Mail', category: 'Email', domain: 'yahoo.com', bgColor: '#6001D2', textColor: '#FFFFFF', iconSlug: 'yahoo' },

  // --- REDES SOCIALES & MENSAJERÍA ---
  { id: 'instagram', name: 'Instagram', category: 'Social', domain: 'instagram.com', bgColor: '#E4405F', textColor: '#FFFFFF', iconSlug: 'instagram' },
  { id: 'x', name: 'X (Twitter)', category: 'Social', domain: 'x.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'x' },
  { id: 'whatsapp', name: 'WhatsApp', category: 'Social', domain: 'whatsapp.com', bgColor: '#25D366', textColor: '#FFFFFF', iconSlug: 'whatsapp' },
  { id: 'telegram', name: 'Telegram', category: 'Social', domain: 'telegram.org', bgColor: '#26A5E4', textColor: '#FFFFFF', iconSlug: 'telegram' },
  { id: 'discord', name: 'Discord', category: 'Social', domain: 'discord.com', bgColor: '#5865F2', textColor: '#FFFFFF', iconSlug: 'discord' },
  { id: 'facebook', name: 'Facebook', category: 'Social', domain: 'facebook.com', bgColor: '#1877F2', textColor: '#FFFFFF', iconSlug: 'facebook' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Social', domain: 'linkedin.com', bgColor: '#0A66C2', textColor: '#FFFFFF', iconSlug: 'linkedin' },
  { id: 'tiktok', name: 'TikTok', category: 'Social', domain: 'tiktok.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'tiktok' },
  { id: 'reddit', name: 'Reddit', category: 'Social', domain: 'reddit.com', bgColor: '#FF4500', textColor: '#FFFFFF', iconSlug: 'reddit' },
  { id: 'pinterest', name: 'Pinterest', category: 'Social', domain: 'pinterest.com', bgColor: '#BD081C', textColor: '#FFFFFF', iconSlug: 'pinterest' },

  // --- INTELIGENCIA ARTIFICIAL ---
  { id: 'openai', name: 'OpenAI / ChatGPT', category: 'IA', domain: 'chatgpt.com', bgColor: '#10A37F', textColor: '#FFFFFF', iconSlug: 'openai' },
  { id: 'anthropic', name: 'Anthropic / Claude', category: 'IA', domain: 'claude.ai', bgColor: '#D97757', textColor: '#FFFFFF', iconSlug: 'anthropic' },
  { id: 'perplexity', name: 'Perplexity AI', category: 'IA', domain: 'perplexity.ai', bgColor: '#20B2AA', textColor: '#FFFFFF', iconSlug: 'perplexity' },
  { id: 'midjourney', name: 'Midjourney', category: 'IA', domain: 'midjourney.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'midjourney' },

  // --- PRODUCTIVIDAD & DESARROLLO ---
  { id: 'github', name: 'GitHub', category: 'Productividad', domain: 'github.com', bgColor: '#181717', textColor: '#FFFFFF', iconSlug: 'github' },
  { id: 'gitlab', name: 'GitLab', category: 'Productividad', domain: 'gitlab.com', bgColor: '#FC6D26', textColor: '#FFFFFF', iconSlug: 'gitlab' },
  { id: 'notion', name: 'Notion', category: 'Productividad', domain: 'notion.so', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'notion' },
  { id: 'slack', name: 'Slack', category: 'Productividad', domain: 'slack.com', bgColor: '#4A154B', textColor: '#FFFFFF', iconSlug: 'slack' },
  { id: 'figma', name: 'Figma', category: 'Productividad', domain: 'figma.com', bgColor: '#F24E1E', textColor: '#FFFFFF', iconSlug: 'figma' },
  { id: 'dropbox', name: 'Dropbox', category: 'Productividad', domain: 'dropbox.com', bgColor: '#0061FF', textColor: '#FFFFFF', iconSlug: 'dropbox' },
  { id: 'trello', name: 'Trello', category: 'Productividad', domain: 'trello.com', bgColor: '#0052CC', textColor: '#FFFFFF', iconSlug: 'trello' },
  { id: 'asana', name: 'Asana', category: 'Productividad', domain: 'asana.com', bgColor: '#F06A6A', textColor: '#FFFFFF', iconSlug: 'asana' },
  { id: 'zoom', name: 'Zoom', category: 'Productividad', domain: 'zoom.us', bgColor: '#2D8CFF', textColor: '#FFFFFF', iconSlug: 'zoom' },
  { id: 'vercel', name: 'Vercel', category: 'Productividad', domain: 'vercel.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'vercel' },
  { id: 'supabase', name: 'Supabase', category: 'Productividad', domain: 'supabase.com', bgColor: '#3ECF8E', textColor: '#000000', iconSlug: 'supabase' },
  { id: 'aws', name: 'AWS (Amazon Web Services)', category: 'Productividad', domain: 'aws.amazon.com', bgColor: '#232F3E', textColor: '#FF9900', iconSlug: 'amazonaws' },

  // --- GAMING ---
  { id: 'steam', name: 'Steam', category: 'Gaming', domain: 'steampowered.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'steam' },
  { id: 'playstation', name: 'PlayStation Network', category: 'Gaming', domain: 'playstation.com', bgColor: '#003791', textColor: '#FFFFFF', iconSlug: 'playstation' },
  { id: 'xbox', name: 'Xbox / Microsoft Gaming', category: 'Gaming', domain: 'xbox.com', bgColor: '#107C10', textColor: '#FFFFFF', iconSlug: 'xbox' },
  { id: 'nintendo', name: 'Nintendo Account', category: 'Gaming', domain: 'nintendo.com', bgColor: '#E60012', textColor: '#FFFFFF', iconSlug: 'nintendo' },
  { id: 'epicgames', name: 'Epic Games', category: 'Gaming', domain: 'epicgames.com', bgColor: '#313131', textColor: '#FFFFFF', iconSlug: 'epicgames' },
  { id: 'riotgames', name: 'Riot Games (Valorant / LoL)', category: 'Gaming', domain: 'riotgames.com', bgColor: '#D32936', textColor: '#FFFFFF', iconSlug: 'riotgames' },
  { id: 'ubisoft', name: 'Ubisoft Connect', category: 'Gaming', domain: 'ubisoft.com', bgColor: '#0070FF', textColor: '#FFFFFF', iconSlug: 'ubisoft' },
  { id: 'ea', name: 'Electronic Arts (EA)', category: 'Gaming', domain: 'ea.com', bgColor: '#000000', textColor: '#FF4747', iconSlug: 'ea' },

  // --- FINANZAS & SHOPPING ---
  { id: 'mercadolibre', name: 'Mercado Libre / Pago', category: 'Finanzas', domain: 'mercadolibre.com', bgColor: '#FFE600', textColor: '#2D3277', iconSlug: 'mercadopago' },
  { id: 'paypal', name: 'PayPal', category: 'Finanzas', domain: 'paypal.com', bgColor: '#003087', textColor: '#FFFFFF', iconSlug: 'paypal' },
  { id: 'stripe', name: 'Stripe', category: 'Finanzas', domain: 'stripe.com', bgColor: '#635BFF', textColor: '#FFFFFF', iconSlug: 'stripe' },
  { id: 'binance', name: 'Binance', category: 'Finanzas', domain: 'binance.com', bgColor: '#F3BA2F', textColor: '#000000', iconSlug: 'binance' },
  { id: 'coinbase', name: 'Coinbase', category: 'Finanzas', domain: 'coinbase.com', bgColor: '#0052FF', textColor: '#FFFFFF', iconSlug: 'coinbase' },
  { id: 'wise', name: 'Wise (TransferWise)', category: 'Finanzas', domain: 'wise.com', bgColor: '#9FE870', textColor: '#163300', iconSlug: 'wise' },
  { id: 'revolut', name: 'Revolut', category: 'Finanzas', domain: 'revolut.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'revolut' },
  { id: 'amazon', name: 'Amazon Store', category: 'Finanzas', domain: 'amazon.com', bgColor: '#FF9900', textColor: '#000000', iconSlug: 'amazon' },
  { id: 'ebay', name: 'eBay', category: 'Finanzas', domain: 'ebay.com', bgColor: '#E53238', textColor: '#FFFFFF', iconSlug: 'ebay' },
  { id: 'uber', name: 'Uber / Uber Eats', category: 'Finanzas', domain: 'uber.com', bgColor: '#000000', textColor: '#FFFFFF', iconSlug: 'uber' },
  { id: 'airbnb', name: 'Airbnb', category: 'Finanzas', domain: 'airbnb.com', bgColor: '#FF5A5F', textColor: '#FFFFFF', iconSlug: 'airbnb' },
];

/**
 * Returns the icon URL from unpkg simple-icons SVG or Google favicon as fallback.
 */
export function getPlatformLogoUrl(platform: PlatformDefinition | null, fallbackDomain?: string): string {
  if (platform?.iconSlug) {
    return `https://cdn.simpleicons.org/${platform.iconSlug}`;
  }
  const domain = platform?.domain || fallbackDomain;
  if (domain) {
    const cleanDomain = domain.replace(/^https?:\/\//i, '').split('/')[0];
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
  }
  return '';
}

/**
 * Finds matching platform by name, keyword or domain.
 */
export function findPlatformByNameOrDomain(input: string): PlatformDefinition | undefined {
  if (!input) return undefined;
  const query = input.toLowerCase().trim();

  return PLATFORMS.find((p) => {
    if (p.name.toLowerCase().includes(query) || query.includes(p.name.toLowerCase())) return true;
    if (p.id.toLowerCase() === query) return true;
    if (p.domain.toLowerCase().includes(query) || query.includes(p.domain.toLowerCase())) return true;
    return false;
  });
}
