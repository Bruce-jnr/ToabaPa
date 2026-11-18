import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Pencil,
  Plus,
  Tag,
  Users,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AdminLayout,
  Dialog,
  AdminLoading,
  AdminEmpty,
} from "./AdminShell.jsx";
import { api } from "./adminApi.js";
import { useOrganizerContext } from "./useOrganizerContext.js";
import { SnackbarNotice } from "../../components/SnackbarProvider.jsx";
export function CategoriesPage({ session }) {
  const context = useOrganizerContext();
  const [params, setParams] = useSearchParams();
  const eventId = params.get("eventId") || "";
  const [items, setItems] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => {
    Promise.all([
      api(
        `/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ""}`,
      ),
      api(
        `/api/v1/organizer/candidates${eventId ? `?eventId=${eventId}` : ""}`,
      ),
    ])
      .then(([categories, candidateData]) => {
        setItems(categories);
        setCandidates(candidateData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);
  useEffect(load, [load]);
  async function archive(item) {
    if (!window.confirm(`Archive ${item.name}?`)) return;
    try {
      await api(`/api/v1/organizer/categories/${item.id}`, {
        method: "DELETE",
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <AdminLayout
      session={session}
      title={eventId ? `${context.events.find((event) => event.id === eventId)?.name || "Event"} categories` : "Categories"}
      description="Choose a category to view its candidates."
      action={
        <button
          className="primary-action"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus />
          New category
        </button>
      }
    >
      {eventId && <Link className="dashboard-flow-back" to="/dashboard/events"><ArrowLeft /> All events</Link>}
      <div className="management-toolbar">
        <label className="toolbar-filter-field">
          <span>Event</span>
          <div className="toolbar-select-control">
            <select
              value={eventId}
              onChange={(event) => {
                setSelectedCategoryId("");
                setParams(event.target.value ? { eventId: event.target.value } : {});
              }}
            >
              <option value="">All events</option>
              {context.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <ChevronDown />
          </div>
        </label>
        <span>{items.length} categories</span>
      </div>
      <SnackbarNotice message={error} />
      {loading ? (
        <AdminLoading type="cards" />
      ) : items.length ? (
        <div className="management-grid">
          {items.map((item) => (
            <div className="category-card-group" key={item.id}>
              <article
                className={`management-card category-drilldown-card ${selectedCategoryId === item.id ? "selected" : ""}`}
              >
                <Link className="category-main-link" to={`/dashboard/candidates?eventId=${encodeURIComponent(item.eventId)}&categoryId=${encodeURIComponent(item.id)}`} aria-label={`View candidates in ${item.name}`}>
                  <div className="category-card-image">
                    {item.imageUrl || item.event.bannerUrl ? (
                      <img src={item.imageUrl || item.event.bannerUrl} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <Tag aria-hidden="true" />
                    )}
                  </div>
                  <div className="category-card-content">
                    <span>{item.event.name}</span>
                    <h2>{item.name}</h2>
                    <p>{item.description || "No description added."}</p>
                  </div>
                </Link>
                <footer>
                  <Link className="category-candidates-link" to={`/dashboard/candidates?eventId=${encodeURIComponent(item.eventId)}&categoryId=${encodeURIComponent(item.id)}`}>
                    {item._count.candidates} candidates
                  </Link>
                  <div className="card-actions">
                    <button type="button" title="View results" aria-label={`View results for ${item.name}`} aria-expanded={selectedCategoryId === item.id} onClick={() => setSelectedCategoryId((current) => current === item.id ? "" : item.id)}>
                      <Users />
                    </button>
                    <button
                      type="button"
                      title="Edit category"
                      onClick={() => {
                        setEditing(item);
                      }}
                    >
                      <Pencil />
                    </button>
                    <button
                      onClick={() => {
                        archive(item);
                      }}
                      type="button"
                      title="Archive category"
                    >
                      <Archive />
                    </button>
                  </div>
                </footer>
              </article>
              {selectedCategoryId === item.id && (
                <div className="mobile-category-results">
                  <CategoryCandidatesPanel
                    category={item}
                    candidates={candidates.filter(
                      (candidate) => candidate.categoryId === item.id,
                    )}
                    onClose={() => setSelectedCategoryId("")}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <AdminEmpty
          icon={Tag}
          title="No categories yet"
          text="Create the first category for an event."
        />
      )}
      {selectedCategoryId && (
        <div className="desktop-category-results">
          <CategoryCandidatesPanel
            category={items.find((item) => item.id === selectedCategoryId)}
            candidates={candidates.filter(
              (candidate) => candidate.categoryId === selectedCategoryId,
            )}
            onClose={() => setSelectedCategoryId("")}
          />
        </div>
      )}
      {showForm && (
        <CategoryForm
          events={context.events}
          initialEventId={eventId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editing && (
        <CategoryForm
          item={editing}
          events={context.events}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}

function CategoryCandidatesPanel({ category, candidates, onClose }) {
  if (!category) return null;
  const ranked = [...candidates].sort(
    (left, right) =>
      right.cachedVoteCount - left.cachedVoteCount ||
      left.name.localeCompare(right.name),
  );
  const totalVotes = ranked.reduce(
    (total, candidate) => total + candidate.cachedVoteCount,
    0,
  );
  return (
    <section className="category-results-panel">
      <header>
        <div>
          <span className="eyebrow">{category.event.name}</span>
          <h2>{category.name}</h2>
          <p>
            {ranked.length} candidates · {totalVotes.toLocaleString()} total
            votes
          </p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close category results"
        >
          <X />
        </button>
      </header>
      {ranked.length ? (
        <div className="category-result-list">
          {ranked.map((candidate, index) => {
            const percentage = totalVotes
              ? (candidate.cachedVoteCount / totalVotes) * 100
              : 0;
            return (
              <article className="category-result-candidate" key={candidate.id}>
                <strong className="result-rank">{index + 1}</strong>
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
                    candidate.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
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
                  <strong>{candidate.cachedVoteCount.toLocaleString()}</strong>
                  <small>{percentage.toFixed(1)}%</small>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmpty
          icon={Users}
          title="No candidates in this category"
          text="Add candidates to begin tracking category results."
        />
      )}
    </section>
  );
}

function CategoryForm({ events, item, initialEventId, onClose, onCreated }) {
  const [form, setForm] = useState({
    eventId: item?.eventId || initialEventId || events[0]?.id || "",
    name: item?.name || "",
    description: item?.description || "",
    imageUrl: item?.imageUrl || "",
    votePriceOverride: item?.votePriceOverride
      ? String(item.votePriceOverride / 100)
      : "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let imageUrl = form.imageUrl || null;
      if (imageFile) {
        const uploaded = await api("/api/v1/organizer/event-images", {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        imageUrl = uploaded.bannerUrl;
      }
      await api(
        item
          ? `/api/v1/organizer/categories/${item.id}`
          : "/api/v1/organizer/categories",
        {
          method: item ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            ...(item ? { eventId: undefined } : {}),
            imageUrl,
            votePriceOverride: form.votePriceOverride
              ? Math.round(Number(form.votePriceOverride) * 100)
              : null,
          }),
        },
      );
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      title={item ? "Edit category" : "Create category"}
      onClose={onClose}
    >
      <form className="admin-form" onSubmit={submit}>
        <label>
          Event
          <select
            value={form.eventId}
            onChange={(event) =>
              setForm({ ...form, eventId: event.target.value })
            }
            required
            disabled={Boolean(item)}
          >
            <option value="" disabled>
              Select event
            </option>
            {events.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category name
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Entrepreneur of the Year"
            required
          />
        </label>
        <label>
          Description
          <textarea
            rows="4"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <label>
          Category image <small>Optional; uses the event banner when empty</small>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
          />
        </label>
        {form.imageUrl && !imageFile && (
          <button className="secondary-action" type="button" onClick={() => setForm({ ...form, imageUrl: "" })}>
            Use event banner
          </button>
        )}
        <label>
          Price override in GHS <small>Optional</small>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.votePriceOverride}
            onChange={(event) =>
              setForm({ ...form, votePriceOverride: event.target.value })
            }
            placeholder="Use event price"
          />
        </label>
        <SnackbarNotice message={error} />
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action" type="submit" disabled={saving}>
            {saving ? "Saving..." : item ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
