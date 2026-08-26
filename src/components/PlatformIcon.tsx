'use client';

import React, { useState } from 'react';
import { findPlatformByNameOrDomain, getPlatformLogoUrl, getSimpleIconUrl, PlatformDefinition } from '@/lib/constants/platforms';

interface PlatformIconProps {
  platformName?: string;
  url?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platformName = '',
  url = '',
  className = '',
  size = 'md',
}) => {
  const matchedPlatform = findPlatformByNameOrDomain(platformName || url);
  const targetDomain = matchedPlatform?.domain || url.replace(/^https?:\/\//i, '').split('/')[0] || '';

  const [imgErrorPrimary, setImgErrorPrimary] = useState(false);
  const [imgErrorSecondary, setImgErrorSecondary] = useState(false);

  const primaryUrl = targetDomain ? getPlatformLogoUrl(targetDomain) : '';
  const secondaryUrl = matchedPlatform?.iconSlug ? getSimpleIconUrl(matchedPlatform.iconSlug) : '';

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg p-1',
    md: 'w-10 h-10 text-sm rounded-xl p-1.5',
    lg: 'w-12 h-12 text-base rounded-2xl p-2',
  }[size];

  const bgColor = matchedPlatform?.bgColor || '#1e293b';

  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 shadow-md border border-white/10 transition-transform overflow-hidden ${sizeClasses} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {!imgErrorPrimary && primaryUrl ? (
        <img
          src={primaryUrl}
          alt={platformName || 'Platform'}
          className="w-full h-full object-contain rounded-md select-none"
          loading="lazy"
          onError={() => setImgErrorPrimary(true)}
        />
      ) : !imgErrorSecondary && secondaryUrl ? (
        <img
          src={secondaryUrl}
          alt={platformName || 'Platform'}
          className="w-full h-full object-contain select-none"
          loading="lazy"
          onError={() => setImgErrorSecondary(true)}
        />
      ) : (
        <span className="font-bold text-white uppercase tracking-wider select-none">
          {platformName ? platformName.trim().substring(0, 2) : 'VA'}
        </span>
      )}
    </div>
  );
};
