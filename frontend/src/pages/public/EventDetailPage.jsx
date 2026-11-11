import { useState } from "react";
import { AlertCircle, CalendarDays, Users, Vote } from "lucide-react";
import { useParams } from "react-router-dom";
import { PublicShell as Shell } from "../../components/layout/PublicShell.jsx";
import {
  ErrorState,
  LoadingCards,
  SearchForm,
  StatusBadge,
} from "../../components/public/EventUi.jsx";
import { VoteDialog } from "../../components/voting/VoteDialog.jsx";
import { formatDate } from "../../lib/format.js";
import { usePublicData } from "../../lib/publicApi.js";

export function EventDetailPage() {
  const { slug } = useParams();
  const event = usePublicData(
    `/api/v1/public/events/${encodeURIComponent(slug)}`,
  );
  const [category, setCategory] = useState("all");
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
  const visibleCategories =
    category === "all"
      ? data.categories
      : data.categories.filter((item) => item.id === category);
  const price = (data.defaultVotePrice / 100).toLocaleString("en-GH", {
    style: "currency",
    currency: data.currency,
  });
  return (
    <Shell>
      <section
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
      </section>
      <section className="contestant-section">
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
        <div className="contestant-heading">
          <div>
            <span className="eyebrow">Meet the contestants</span>
            <h2>Choose who you want to support.</h2>
          </div>
          <SearchForm compact />
        </div>
        <div
          className="category-tabs"
          role="tablist"
          aria-label="Contestant categories"
        >
          <button
            className={category === "all" ? "active" : ""}
            onClick={() => setCategory("all")}
            type="button"
          >
            All contestants <span>{data.candidates.length}</span>
          </button>
          {data.categories.map((item) => (
            <button
              className={category === item.id ? "active" : ""}
              onClick={() => setCategory(item.id)}
              type="button"
              key={item.id}
            >
              {item.name} <span>{item._count.candidates}</span>
            </button>
          ))}
        </div>
        {visibleCategories.length ? (
          <div className="category-contestant-groups">
            {visibleCategories.map((categoryItem) => (
              <CategoryContestants
                category={categoryItem}
                candidates={data.candidates.filter(
                  (candidate) => candidate.categoryId === categoryItem.id,
                )}
                result={data.categoryResults.find(
                  (item) => item.categoryId === categoryItem.id,
                )}
                eventStatus={data.publicStatus}
                onVote={setVoteCandidate}
                key={categoryItem.id}
              />
            ))}
          </div>
        ) : (
          <div className="message-state">
            <Users />
            <strong>No contestants in this category.</strong>
            <span>Check another category.</span>
          </div>
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
  category,
  candidates,
  result,
  eventStatus,
  onVote,
}) {
  const rankedCandidates = [...candidates].sort(
    (left, right) =>
      (left.result?.rank ?? Number.MAX_SAFE_INTEGER) -
        (right.result?.rank ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name),
  );
  const resultsVisible = [
    "EXACT_TOTALS",
    "PERCENTAGES",
    "RANKING_ONLY",
  ].includes(result?.visibility);
  return (
    <section className="category-contestant-group">
      <div className="category-statistics">
        <div>
          <span>Category voting statistics</span>
          <h3>{category.name}</h3>
          <p>
            {category.description ||
              `${candidates.length} contestants in this category.`}
          </p>
        </div>
        <div className="public-category-results">
          {resultsVisible && rankedCandidates.length ? (
            <div className="category-result-list">
              {rankedCandidates.map((candidate, index) => {
                const votes = candidate.result?.votes ?? 0;
                const percentage =
                  candidate.result?.percentage ??
                  (result?.totalVotes ? (votes / result.totalVotes) * 100 : 0);
                const initials = candidate.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2);
                return (
                  <article
                    className="category-result-candidate"
                    key={candidate.id}
                  >
                    <strong className="result-rank">
                      {candidate.result?.rank ?? index + 1}
                    </strong>
                    <span
                      className={`result-photo ${candidate.photoUrl ? "has-photo" : ""}`}
                    >
                      {candidate.photoUrl ? (
                        <img
                          src={candidate.photoUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        initials
                      )}
                    </span>
                    <div className="result-candidate-name">
                      <strong>{candidate.name}</strong>
                      <small>{candidate.candidateCode}</small>
                    </div>
                    <div className="result-progress">
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="result-total">
                      <strong>
                        {result.visibility === "EXACT_TOTALS"
                          ? votes.toLocaleString()
                          : result.visibility === "PERCENTAGES"
                            ? `${percentage.toFixed(1)}%`
                            : `#${candidate.result?.rank ?? index + 1}`}
                      </strong>
                      <small>
                        {result.visibility === "EXACT_TOTALS"
                          ? `${percentage.toFixed(1)}%`
                          : result.visibility === "PERCENTAGES"
                            ? `Rank #${candidate.result?.rank ?? index + 1}`
                            : "Rank"}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="public-results-private">
              <strong>{candidates.length} contestants</strong>
              <span>Voting statistics are currently private.</span>
            </div>
          )}
        </div>
      </div>
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
