import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal scroll carousel with arrow navigation.
 * Works natively on mobile (swipe), arrow buttons on desktop.
 */
export default function Carousel({ children, className = '', itemWidth = 'w-72 sm:w-80' }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [children]);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
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
        ref={ref}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`.carousel-track::-webkit-scrollbar { display: none; }`}</style>
        {React.Children.map(children, (child, i) => (
          <div
            key={i}
            className={`${itemWidth} shrink-0`}
            style={{ scrollSnapAlign: 'start' }}
          >
            {child}
          </div>
        ))}
        {/* End padding */}
        <div className="shrink-0 w-4" />
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
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
