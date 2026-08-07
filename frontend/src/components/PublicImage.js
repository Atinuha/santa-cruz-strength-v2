import React, { useEffect, useState } from 'react';

/**
 * Renders locally packaged documentary photography.
 *
 * A null or missing src means no honest photograph exists for that slot yet, so
 * nothing is rendered. Substituting a different photograph would misrepresent
 * the subject, which is exactly what the media policy forbids.
 */
export default function PublicImage({
  src,
  fallbackSrc = null,
  className = '',
  loading = 'eager',
  decoding = 'async',
  onError,
  onLoad,
  ...props
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setUsingFallback(false);
  }, [src]);

  if (!currentSrc) return null;

  return (
    <img
      {...props}
      src={currentSrc}
      loading={loading}
      decoding={decoding}
      className={`scs-public-image ${className}`.trim()}
      data-image-fallback={usingFallback ? 'true' : undefined}
      onLoad={(event) => {
        event.currentTarget.removeAttribute('data-image-unavailable');
        onLoad?.(event);
      }}
      onError={(event) => {
        onError?.(event);
        if (!usingFallback && fallbackSrc && currentSrc !== fallbackSrc) {
          setUsingFallback(true);
          setCurrentSrc(fallbackSrc);
          return;
        }
        event.currentTarget.dataset.imageUnavailable = 'true';
      }}
    />
  );
}
