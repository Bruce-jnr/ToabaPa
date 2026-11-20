import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicShell as Shell } from '../../components/layout/PublicShell.jsx';
import { StatusBadge } from '../../components/public/EventUi.jsx';
import { getDemoEvent } from '../../lib/demoEvents.js';
import { isMarketingSite, publicPageHref } from '../../lib/siteUrls.js';

export function DemoEventPage() {
  const { slug, categorySlug } = useParams();
  const event = getDemoEvent(slug);
  const category = event?.categories.find((item) => item.slug === categorySlug);
  const listingHref = isMarketingSite
    ? '/events?status=ended'
    : publicPageHref('/events?status=ended');

  return (
    <Shell>
      <section className="content-section demo-event-page">
        <Link
          className="category-back-link"
          to={
            categorySlug && event ? `/demo/events/${event.slug}` : listingHref
          }
        >
          <ArrowLeft size={18} />{' '}
          {categorySlug ? 'All demo categories' : 'All events'}
        </Link>
        {!event || (categorySlug && !category) ? (
          <div className="message-state">
            <strong>Demo example not found.</strong>
            <Link to={listingHref}>Browse events</Link>
          </div>
        ) : (
          <>
            <div className="demo-event-intro">
              <img className="demo-event-emblem" src={event.bannerUrl} alt="" />
              <div>
                <span className="eyebrow">No votes were cast</span>
                <StatusBadge status="ended" />
                <h1>{category ? category.name : event.name}</h1>
                <p>
                  {category
                    ? `A sample category in ${event.name}.`
                    : `A sample event by ${event.organization.name}. It shows how an ended event and its categories could appear on Toabapa.`}
                </p>
              </div>
            </div>
            {category ? (
              <div className="message-state demo-empty-state">
                <Users aria-hidden="true" />
                <strong>Sample category</strong>
              </div>
            ) : (
              <>
                <div className="contestant-heading">
                  <div>
                    <h2>Explore categories</h2>
                  </div>
                </div>
                <div className="public-category-grid">
                  {event.categories.map((item) => (
                    <Link
                      className="event-card public-category-card demo-category-card"
                      key={item.id}
                      to={`/demo/events/${event.slug}/categories/${item.slug}`}
                    >
                      <div className="event-image">
                        <img
                          src={event.bannerUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="event-content">
                        <p className="event-organizer">{event.name}</p>
                        <h3>{item.name}</h3>
                        <span className="event-link">
                          View demo category <ArrowRight />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </Shell>
  );
}
