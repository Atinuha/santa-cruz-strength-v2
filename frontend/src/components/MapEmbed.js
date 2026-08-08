import React from 'react';
import { GYM_CONFIG } from '../config';

/**
 * The location map.
 *
 * This used to sit behind a "Show the map" button. That was a privacy call:
 * the embed is a third party frame, so rendering it immediately sends the
 * visitor's IP and sets Google cookies before the consent control has been
 * answered. The owner reviewed it and asked for the map to be visible on
 * arrival, which is the right call for a local gym whose visitors are mostly
 * trying to work out how far away it is.
 *
 * Recorded rather than hidden, because it is a real tradeoff: this frame loads
 * for every visitor regardless of their consent choice. If that ever needs to
 * change, the honest fix is to gate it on the existing marketing consent value
 * from utils/analyticsConsent rather than on a button nobody presses.
 *
 * The address and the directions link stay outside the frame so the useful
 * information survives if Google is blocked, slow, or unavailable.
 */
export default function MapEmbed({ testId = 'contact-map-embed', className = '' }) {
  return (
    <div className={`scs-map ${className}`.trim()} data-testid={testId}>
      <iframe
        title={`Map showing Santa Cruz Strength at ${GYM_CONFIG.address.full}`}
        src={GYM_CONFIG.mapEmbedUrl}
        width="100%"
        height="100%"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
