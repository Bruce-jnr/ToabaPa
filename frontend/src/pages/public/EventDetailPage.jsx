import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Users, Vote } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PublicShell as Shell } from "../../components/layout/PublicShell.jsx";
import {
  ErrorState,
  LoadingCards,
  StatusBadge,
} from "../../components/public/EventUi.jsx";
import { VoteDialog } from "../../components/voting/VoteDialog.jsx";
import { formatDate } from "../../lib/format.js";
import { usePublicData } from "../../lib/publicApi.js";

export function EventDetailPage() {
  const { slug, categorySlug } = useParams();
  const event = usePublicData(
    `/api/v1/public/events/${encodeURIComponent(slug)}`,
  );
  const [voteCandidate, setVoteCandidate] = useState(null);
  if (event.loading)
    return (
      <Shell>
        <div className="event-detail-state">
          <LoadingCards />
        </div>
      </Shell>
    );
  if (event.error)
    return (
      <Shell>
        <div className="event-detail-state">
          <ErrorState message={event.error} />
        </div>
      </Shell>
    );
  const data = event.data;
  const selectedCategory = categorySlug
    ? data.categories.find((item) => item.slug === categorySlug)
    : null;
  const price = (data.defaultVotePrice / 100).toLocaleString("en-GH", {
    style: "currency",
    currency: data.currency,
  });
  return (
    <Shell>
      {!categorySlug && <section
        className={`event-detail-hero ${data.bannerUrl ? "has-banner" : ""}`}
        style={
          data.bannerUrl
            ? { backgroundImage: `url(${data.bannerUrl})` }
            : undefined
        }
      >
        <div className="event-detail-overlay" />
        <div className="event-detail-copy">
          <StatusBadge status={data.publicStatus} />
          <span>{data.organization.name}</span>
          <h1>{data.name}</h1>
          <p>
            {data.description ||
              "Explore the categories and contestants in this event."}
          </p>
          <div className="event-detail-meta">
            <span>
              <CalendarDays />
              {data.publicStatus === "live"
                ? `Voting ends ${formatDate(data.endAt)}`
                : data.publicStatus === "paused"
                  ? "Voting is temporarily paused"
                  : `Voting starts ${formatDate(data.startAt)}`}
            </span>
            <span>
              <Vote />
              {price} per vote
            </span>
            <span>
              <Users />
              {data.candidates.length} contestants
            </span>
          </div>
        </div>
      </section>}
      <section className="contestant-section">
        {categorySlug && (
          <Link className="category-back-link" to={`/events/${data.slug}`}>
            <ArrowLeft size={18} /> All categories in {data.name}
          </Link>
        )}
        {data.publicStatus === "paused" && (
          <div className="voting-paused-notice">
            <AlertCircle />
            <div>
              <strong>Voting is temporarily paused</strong>
              <span>
                You can still explore the contestants. Voting will resume when
                the organizer reopens it.
              </span>
            </div>
          </div>
        )}
        {selectedCategory ? (
          <>
            <h1 className="category-page-title">{selectedCategory.name} candidates and scores</h1>
            <CategoryContestants
              candidates={data.candidates.filter((candidate) => candidate.categoryId === selectedCategory.id)}
              eventStatus={data.publicStatus}
              onVote={setVoteCandidate}
            />
          </>
        ) : categorySlug ? (
          <div className="message-state">
            <Users />
            <strong>Category not found.</strong>
            <Link to={`/events/${data.slug}`}>View all categories</Link>
          </div>
        ) : (
          <>
            <div className="contestant-heading">
              <div>
                <h2>Explore categories</h2>
                <p>Choose a category to see its candidates and scores.</p>
              </div>
            </div>
            {data.categories.length ? (
              <div className="public-category-grid">
                {data.categories.map((item) => (
                  <Link
                    className="event-card public-category-card"
                    key={item.id}
                    to={`/events/${data.slug}/categories/${item.slug}`}
                    aria-label={`View ${item.name} candidates and scores`}
                  >
                    <div className="event-image">
                      {(item.imageUrl || data.bannerUrl) ? (
                        <img
                          src={item.imageUrl || data.bannerUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="event-image-fallback"><Users /></div>
                      )}
                      <StatusBadge status={data.publicStatus} />
                    </div>
                    <div className="event-content">
                      <p className="event-organizer">{data.name}</p>
                      <h3>{item.name}</h3>
                      {item.description && <p className="public-category-description">{item.description}</p>}
                      <div className="event-meta"><span><Users /> {item._count.candidates} candidates</span></div>
                      <span className="event-link">View candidates <ArrowRight /></span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="message-state">
                <Users />
                <strong>No categories yet.</strong>
                <span>Check back when the organizer adds categories.</span>
              </div>
            )}
          </>
        )}
      </section>
      {voteCandidate && (
        <VoteDialog
          candidate={voteCandidate}
          event={data}
          onClose={() => setVoteCandidate(null)}
        />
      )}
    </Shell>
  );
}

function CategoryContestants({
  candidates,
  eventStatus,
  onVote,
}) {
  return (
    <section className="category-contestant-group">
      {candidates.length ? (
        <div className="contestant-grid">
          {candidates.map((candidate) => {
            const initials = candidate.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2);
            return (
              <article className="contestant-card" key={candidate.id}>
                <div className="contestant-portrait">
                  {candidate.photoUrl ? (
                    <img
                      src={candidate.photoUrl}
                      alt={candidate.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <b>{candidate.candidateCode}</b>
                  {candidate.result && (
                    <div className="candidate-result">
                      <small>Rank #{candidate.result.rank}</small>
                      <strong>
                        {candidate.result.votes !== undefined
                          ? `${candidate.result.votes.toLocaleString()} votes`
                          : candidate.result.percentage !== undefined
                            ? `${candidate.result.percentage}%`
                            : `#${candidate.result.rank}`}
                      </strong>
                    </div>
                  )}
                </div>
                <div className="contestant-body">
                  <span>{candidate.category.name}</span>
                  <h3>{candidate.name}</h3>
                  <p>
                    {candidate.slogan ||
                      candidate.biography ||
                      "Support this contestant in the event."}
                  </p>
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => onVote(candidate)}
                    disabled={eventStatus !== "live"}
                  >
                    <Vote />
                    {eventStatus === "live"
                      ? "Vote now"
                      : eventStatus === "paused"
                        ? "Voting paused"
                        : "Voting unavailable"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="message-state">
          <Users />
          <strong>No contestants in this category.</strong>
          <span>Contestants will appear here when added.</span>
        </div>
      )}
    </section>
  );
}
