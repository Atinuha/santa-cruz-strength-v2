import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal scroll carousel with:
 *  - Arrow navigation (desktop)
 *  - Native touch/swipe (mobile)
 *  - Auto-scroll (pauses on hover / user interaction)
 *  - Infinite loop via duplicated items
 */
export default function Carousel({
  children,
  className = '',
  itemWidth = 'w-72 sm:w-80',
  autoScrollInterval = 3500,  // ms between auto-advances
}) {
  const trackRef   = useRef(null);
  const timerRef   = useRef(null);
  const pausedRef  = useRef(false);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const childArray = React.Children.toArray(children);
  // Duplicate items to create a seamless loop
  const allItems = [...childArray, ...childArray, ...childArray];

  // ── Scroll state ────────────────────────────────────────────────────────────
  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll, children]);

  // ── Jump to middle set on mount so we can scroll both ways ─────────────────
  useEffect(() => {
    const el = trackRef.current;
    if (!el || childArray.length === 0) return;
    // Wait for layout then scroll to start of second (middle) set
    requestAnimationFrame(() => {
      const itemW = el.scrollWidth / 3;
      el.scrollLeft = itemW;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll one "item width" in a direction ─────────────────────────────────
  const scroll = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.72;
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  }, []);

  // ── Infinite loop: teleport back to middle set when near the edges ─────────
  const handleScrollEnd = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const setW = el.scrollWidth / 3;
    // If scrolled into last duplicated set → jump back to middle
    if (el.scrollLeft >= setW * 2) {
      el.scrollLeft -= setW;
    }
    // If scrolled into first duplicated set → jump forward to middle
    if (el.scrollLeft <= 0) {
      el.scrollLeft += setW;
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scrollend', handleScrollEnd, { passive: true });
    // Fallback for browsers without scrollend
    const onScroll = () => {
      clearTimeout(el._scrollTimer);
      el._scrollTimer = setTimeout(handleScrollEnd, 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scrollend', handleScrollEnd);
      el.removeEventListener('scroll', onScroll);
    };
  }, [handleScrollEnd]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  const startAutoScroll = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) scroll('right');
    }, autoScrollInterval);
  }, [scroll, autoScrollInterval]);

  useEffect(() => {
    startAutoScroll();
    return () => clearInterval(timerRef.current);
  }, [startAutoScroll]);

  const pauseAutoScroll = () => { pausedRef.current = true; };
  const resumeAutoScroll = () => {
    pausedRef.current = false;
    startAutoScroll();
  };

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={pauseAutoScroll}
      onMouseLeave={resumeAutoScroll}
      onTouchStart={pauseAutoScroll}
      onTouchEnd={() => setTimeout(resumeAutoScroll, 2000)}
    >
      {/* Left arrow */}
      <button
        onClick={() => { pauseAutoScroll(); scroll('left'); setTimeout(resumeAutoScroll, 2000); }}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center transition-all duration-200 ${
          canLeft ? 'opacity-100 shadow-md hover:shadow-lg hover:scale-105' : 'opacity-0 pointer-events-none'
        }`}
        style={{ border: '1.5px solid var(--clr-border-green)', color: 'var(--clr-green)' }}
        aria-label="Scroll left"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {allItems.map((child, i) => (
          <div
            key={i}
            className={`${itemWidth} shrink-0`}
            style={{ scrollSnapAlign: 'start' }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => { pauseAutoScroll(); scroll('right'); setTimeout(resumeAutoScroll, 2000); }}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center transition-all duration-200 ${
          canRight ? 'opacity-100 shadow-md hover:shadow-lg hover:scale-105' : 'opacity-0 pointer-events-none'
        }`}
        style={{ border: '1.5px solid var(--clr-border-green)', color: 'var(--clr-green)' }}
        aria-label="Scroll right"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
