import { useMemo } from 'react';
import { ArrowRight, Search, ShieldCheck, Vote } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicShell as Shell } from '../../components/layout/PublicShell.jsx';
import { ErrorState, EventCard, LoadingCards, ScrollReveal, SearchForm } from '../../components/public/EventUi.jsx';
import { usePublicData } from '../../lib/publicApi.js';

export function HomePage() {
  const events = usePublicData('/api/v1/public/events?status=live');
  return (
    <Shell>
      <section className="hero-section">
        <ScrollReveal className="hero-copy">
          <span className="eyebrow">Public voting platform</span>
          <h1>Online voting for Ghana&apos;s events</h1>
          <p>
            Find a live event, choose a candidate, and cast verified votes in
            three clear steps.
          </p>
          <SearchForm />
        </ScrollReveal>
        <ScrollReveal className="hero-art reveal-scale" delay={100} aria-label="Toabapa voting interface preview">
          <div className="vote-preview">
            <div className="vote-preview-head">
              <span className="preview-icon"><Vote /></span>
              <span className="status-badge live"><span />Live voting</span>
            </div>
            <div className="vote-preview-copy">
              <span>Candidate selected</span>
              <strong>Choose your votes</strong>
            </div>
            <div className="vote-quantity" aria-hidden="true">
              <span>−</span><strong>5</strong><span>+</span>
            </div>
            <div className="vote-preview-total">
              <span>Payment total</span>
              <strong>GHS 5.00</strong>
            </div>
            <div className="preview-action">Continue securely <ArrowRight /></div>
          </div>
          <div className="verified-float"><ShieldCheck /> Payment verified</div>
        </ScrollReveal>
      </section>
      <section className="content-section">
        <ScrollReveal className="section-heading">
          <div>
            <span className="eyebrow">Happening now</span>
            <h2>Live events</h2>
          </div>
          <Link to="/events?status=live">
            See live events <ArrowRight />
          </Link>
        </ScrollReveal>
        {events.loading ? (
          <LoadingCards />
        ) : events.error ? (
          <ErrorState message={events.error} />
        ) : events.data.length ? (
          <div className="event-grid">
            {events.data.slice(0, 3).map((event, index) => (
              <ScrollReveal key={event.id} delay={index * 80}>
                <EventCard event={event} featured />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="message-state">
            <strong>No live events right now.</strong>
            <span>Check back soon for new competitions.</span>
          </div>
        )}
      </section>
      <section className="how-section">
        <ScrollReveal>
          <span className="eyebrow">How voting works</span>
          <h2>Voting in three clear steps</h2>
          <Link className="how-organizer-link" to="/how-it-works">
            See how it works for organizers <ArrowRight />
          </Link>
        </ScrollReveal>
        <ol>
          <ScrollReveal as="li">
            <b>01</b>
            <strong>Find a candidate</strong>
            <span>Search by name or candidate code.</span>
          </ScrollReveal>
          <ScrollReveal as="li" delay={80}>
            <b>02</b>
            <strong>Choose your votes</strong>
            <span>Select how many votes you want to cast.</span>
          </ScrollReveal>
          <ScrollReveal as="li" delay={160}>
            <b>03</b>
            <strong>Confirm payment</strong>
            <span>Confirm payment and receive your reference.</span>
          </ScrollReveal>
        </ol>
      </section>
      <section className="faq-section" id="faq">
        <ScrollReveal className="faq-heading">
          <span className="eyebrow">Frequently asked questions</span>
          <h2>What voters need to know</h2>
          <p>Clear answers about voting, payments, results, and privacy.</p>
        </ScrollReveal>
        <ScrollReveal className="faq-list" delay={80}>
          <details>
            <summary>Do I need an account to vote?</summary>
            <p>
              No. You can vote using your mobile number without creating a
              Toabapa account.
            </p>
          </details>
          <details>
            <summary>When are my votes counted?</summary>
            <p>
              Votes are credited only after the payment provider confirms the
              correct amount and currency. A failed or abandoned payment does
              not add votes.
            </p>
          </details>
          <details>
            <summary>Can a successful payment add votes twice?</summary>
            <p>
              No. Each payment reference can create only one vote transaction,
              including when a provider sends the same confirmation more than
              once.
            </p>
          </details>
          <details>
            <summary>Why might voting be unavailable?</summary>
            <p>
              An event may not have started, may have ended, or may be
              temporarily paused by its organizer.
            </p>
          </details>
          <details>
            <summary>Does Toabapa collect my Mobile Money PIN?</summary>
            <p>
              No. PIN entry and payment authorization happen securely through
              your mobile network or payment provider.
            </p>
          </details>
          <details>
            <summary>Who controls event information and results?</summary>
            <p>
              The event organizer manages contestants, schedules, pricing, and
              result visibility. Toabapa provides the voting and transaction
              platform.
            </p>
          </details>
        </ScrollReveal>
      </section>
    </Shell>
  );
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const search = params.get('search') || '';
  const focusSearch = params.get('focus') === 'search';
  const path = useMemo(
    () =>
      `/api/v1/public/events?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`,
    [status, search],
  );
  const events = usePublicData(path);
  function changeStatus(next) {
    const updated = new URLSearchParams(params);
    if (next === 'all') updated.delete('status');
    else updated.set('status', next);
    setParams(updated);
  }
  return (
    <Shell>
      <ScrollReveal as="section" className="explore-intro">
        <span className="eyebrow">Event discovery</span>
        <h1>Find an event worth celebrating.</h1>
        <p>
          Browse live competitions, upcoming events, and recently announced
          results.
        </p>
        <SearchForm
          key={`${search}-${focusSearch}`}
          initialValue={search}
          compact
          focus={focusSearch}
        />
      </ScrollReveal>
      <section className="content-section explore-content">
        <ScrollReveal
          className="filter-row"
          role="group"
          aria-label="Filter events by status"
        >
          {['all', 'live', 'upcoming', 'ended'].map((item) => (
            <button
              className={status === item ? 'active' : ''}
              onClick={() => changeStatus(item)}
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </ScrollReveal>
        <ScrollReveal className="results-heading">
          <h2>
            {search
              ? `Results for “${search}”`
              : status === 'all'
                ? 'All events'
                : `${status} events`}
          </h2>
          <span>
            {events.loading ? 'Loading' : `${events.data.length} found`}
          </span>
        </ScrollReveal>
        {events.loading ? (
          <LoadingCards />
        ) : events.error ? (
          <ErrorState message={events.error} />
        ) : events.data.length ? (
          <div className="event-grid explore-grid">
            {events.data.map((event, index) => (
              <ScrollReveal key={event.id} delay={(index % 3) * 80}>
                <EventCard event={event} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="message-state">
            <Search />
            <strong>No matching events.</strong>
            <span>Try another search or event status.</span>
          </div>
        )}
      </section>
    </Shell>
  );
}


