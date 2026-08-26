/**
 * Intelligent parser to extract OTP verification codes and Magic Links
 * from incoming family email forwarding webhooks (Disney+, Netflix, Spotify, Steam, etc.).
 */

export interface ParsedEmailOtp {
  serviceName: string;
  code: string;
  snippet: string;
  senderEmail: string;
  subject: string;
}

export function parseEmailForOtp(params: {
  sender?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
}): ParsedEmailOtp | null {
  const sender = (params.sender || '').toLowerCase();
  const subject = params.subject || '';
  const content = `${params.subject || ''} \n ${params.bodyText || ''} \n ${params.bodyHtml || ''}`;

  // 1. Detect service name
  let serviceName = 'Servicio';
  if (sender.includes('disney') || content.toLowerCase().includes('disney')) {
    serviceName = 'Disney+';
  } else if (sender.includes('netflix') || content.toLowerCase().includes('netflix')) {
    serviceName = 'Netflix';
  } else if (sender.includes('spotify') || content.toLowerCase().includes('spotify')) {
    serviceName = 'Spotify';
  } else if (sender.includes('amazon') || sender.includes('prime') || content.toLowerCase().includes('prime video')) {
    serviceName = 'Amazon Prime';
  } else if (sender.includes('steampowered') || content.toLowerCase().includes('steam guard')) {
    serviceName = 'Steam';
  } else if (sender.includes('playstation') || sender.includes('sony')) {
    serviceName = 'PlayStation Network';
  } else if (sender.includes('mercadolibre') || sender.includes('mercadopago')) {
    serviceName = 'Mercado Libre / Pago';
  } else if (sender.includes('google') || sender.includes('gmail')) {
    serviceName = 'Google';
  } else if (sender.includes('microsoft') || sender.includes('xbox')) {
    serviceName = 'Microsoft / Xbox';
  } else if (params.sender) {
    serviceName = params.sender.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Servicio';
  }

  // 2. Extract numeric OTP Code (e.g. "Tu código es 492810", "código de un solo uso: 849201", "492-108", "8492")
  let code = '';

  // Patterns for explicit code mentions
  const explicitPatterns = [
    /(?:código|codigo|code|clave|pin|código de acceso|verification code)[^\d\n\r]{1,30}(\b\d{4,8}\b)/i,
    /(?:código|codigo|code|clave|pin)[^\d\n\r]{1,30}(\b\d{3}[-\s]\d{3}\b)/i,
    /\b([0-9]{6})\b/, // standard 6-digit OTP
    /\b([0-9]{4})\b/, // 4-digit PIN
    /\b([0-9]{8})\b/, // 8-digit code
  ];

  for (const pattern of explicitPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      code = match[1].replace(/[-\s]/g, '');
      break;
    }
  }

  // 3. Fallback: Search for Netflix "Actualizar Hogar / Confirmar acceso" link if no numeric code
  if (!code && content.includes('http')) {
    const linkMatch = content.match(/https?:\/\/[^\s<>"']+(?:update-primary-location|travel-verification|verify)[^\s<>"']*/i);
    if (linkMatch) {
      code = linkMatch[0];
    }
  }

  if (!code) {
    return null;
  }

  // 4. Generate human-readable snippet
  const cleanSnippet = subject || content.substring(0, 120).replace(/\s+/g, ' ').trim();

  return {
    serviceName,
    code,
    snippet: cleanSnippet,
    senderEmail: params.sender || '',
    subject: params.subject || '',
  };
}
