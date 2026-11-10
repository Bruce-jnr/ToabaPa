import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '../../lib/format.js';

export function SearchForm({
  initialValue = '',
  compact = false,
  focus = false,
}) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  useEffect(() => {
    if (focus) inputRef.current?.focus();
  }, [focus]);
  function submit(event) {
    event.preventDefault();
    navigate(
      `/events${value.trim() ? `?search=${encodeURIComponent(value.trim())}` : ''}`,
    );
  }
  return (
    <form
      className={`search-form ${compact ? 'compact' : ''}`}
      onSubmit={submit}
      role="search"
    >
      <Search aria-hidden="true" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search candidate, event or code"
        aria-label="Search Toabapa"
      />
      <button
        className="icon-button search-submit"
        type="submit"
        aria-label="Search"
        title="Search"
      >
        <ArrowRight size={19} />
      </button>
    </form>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`}>
      <span />
      {status === 'live' ? 'Live' : status}
    </span>
  );
}

export function EventCard({ event, featured = false }) {
  return (
    <Link
      className={`event-card ${featured ? 'featured' : ''}`}
      to={`/events/${event.slug}`}
      aria-label={`Explore ${event.name}`}
    >
      <div
        className="event-image"
        style={
          event.bannerUrl
            ? { backgroundImage: `url(${event.bannerUrl})` }
            : undefined
        }
      >
        <StatusBadge status={event.publicStatus} />
        <div className="event-image-fallback">
          <Trophy />
        </div>
      </div>
      <div className="event-content">
        <p className="event-organizer">{event.organization.name}</p>
        <h3>{event.name}</h3>
        <div className="event-meta">
          <span>
            <Users />
            {event._count.candidates} candidates
          </span>
          <span>
            <CalendarDays />
            {event.publicStatus === 'live'
              ? `Ends ${formatDate(event.endAt)}`
              : formatDate(event.startAt)}
          </span>
        </div>
        <span className="event-link">
          {event.publicStatus === 'ended' ? 'View results' : 'Explore event'}
          <ChevronRight />
        </span>
      </div>
    </Link>
  );
}

export function LoadingCards() {
  return (
    <div
      className="event-grid skeleton-event-grid"
      aria-label="Loading events"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <article
          className="event-card skeleton-event-card"
          key={item}
          aria-hidden="true"
        >
          <div className="skeleton-block skeleton-event-image" />
          <div className="event-content">
            <span className="skeleton-line short" />
            <span className="skeleton-line title" />
            <span className="skeleton-line" />
            <span className="skeleton-line medium" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="message-state error">
      <strong>We couldn&apos;t load this page.</strong>
      <span>{message}</span>
    </div>
  );
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  as: Element = 'div',
  ...props
}) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      node.classList.add('is-revealed');
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-revealed');
          observer.unobserve(node);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Element
      {...props}
      ref={ref}
      className={`scroll-reveal ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms`, ...props.style }}
    >
      {children}
    </Element>
  );
}
