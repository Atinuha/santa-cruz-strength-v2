import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { GYM_CONFIG } from '../config';

/**
 * The map loads on request, not on page load.
 *
 * The embedded iframe is a third party frame. Rendering it immediately sends
 * the visitor's IP address and sets Google cookies before the consent banner
 * has been answered, which is the exact thing the analytics gate elsewhere in
 * this app exists to prevent. A map is also not why anyone is on the page, so
 * paying that cost for every visitor buys nothing.
 *
 * The address and the directions link are plain markup and always present, so
 * the useful information survives whether or not the frame is ever loaded.
 */
export default function MapEmbed({ testId = 'contact-map-embed' }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="scs-map" data-testid={testId}>
      {loaded ? (
        <iframe
          title="Santa Cruz Strength location"
          src={GYM_CONFIG.mapEmbedUrl}
          width="100%"
          height="100%"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="scs-map-placeholder">
          <MapPin size={22} aria-hidden="true" />
          <p className="scs-map-address">
            {GYM_CONFIG.address.street}
            <br />
            {GYM_CONFIG.address.city}, {GYM_CONFIG.address.state} {GYM_CONFIG.address.zip}
          </p>
          <button
            type="button"
            className="scs-button scs-button-secondary"
            onClick={() => setLoaded(true)}
            data-testid="map-load-button"
          >
            Show the map
          </button>
          <a
            className="scs-text-link"
            href={GYM_CONFIG.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open directions in Google Maps
          </a>
          <small>The map is a Google frame. It loads only when you ask for it.</small>
        </div>
      )}
    </div>
  );
}
