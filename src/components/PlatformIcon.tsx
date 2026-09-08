'use client';

import React from 'react';
import { findPlatformByNameOrDomain } from '@/lib/constants/platforms';
import { PLATFORM_MARKS } from '@/lib/constants/platform-marks';

interface PlatformIconProps {
  platformName?: string;
  url?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Privacy-first platform mark.
 *
 * Never fetch favicons from Google, SimpleIcons or another third party using a
 * decrypted credential domain. Doing so leaks vault metadata after unlock.
 */
export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platformName = '',
  url = '',
  className = '',
  size = 'md',
}) => {
  const matchedPlatform = findPlatformByNameOrDomain(platformName) || findPlatformByNameOrDomain(url);
  const mark = matchedPlatform?.iconSlug ? PLATFORM_MARKS[matchedPlatform.iconSlug] : undefined;
  const label = matchedPlatform?.name || platformName || 'Vault';
  const words = label.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? `${words[0][0] || ''}${words[1][0] || ''}`
    : label.trim().substring(0, 2);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px] rounded-lg',
    md: 'w-10 h-10 text-xs rounded-xl',
    lg: 'w-12 h-12 text-sm rounded-2xl',
  }[size];

  const bgColor = matchedPlatform?.bgColor || '#1e293b';

  return (
    <div
      aria-label={`Servicio: ${label}`}
      className={`relative flex items-center justify-center flex-shrink-0 shadow-md border border-white/10 overflow-hidden ${sizeClasses} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {mark ? <svg viewBox="0 0 24 24" className="h-[65%] w-[65%]" fill="white" aria-hidden="true"><path d={mark.path} /></svg> : <span className="font-bold text-white uppercase tracking-wider select-none" aria-hidden="true">
        {initials || 'VA'}
      </span>}
    </div>
  );
};
