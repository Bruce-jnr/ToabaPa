import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Users,
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
export function CandidatesPage({ session }) {
  const context = useOrganizerContext();
  const [params, setParams] = useSearchParams();
  const eventId = params.get("eventId") || "";
  const categoryId = params.get("categoryId") || "";
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const load = useCallback(() => {
    Promise.all([
      api(
        `/api/v1/organizer/candidates${eventId ? `?eventId=${eventId}` : ""}`,
      ),
      api(
        `/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ""}`,
      ),
    ])
      .then(([candidates, categoryData]) => {
        setItems(candidates);
        setCategories(categoryData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);
  useEffect(load, [load]);
  const visibleItems = categoryId
    ? items.filter((item) => item.categoryId === categoryId)
    : items;
  const selectedCategory = categories.find((item) => item.id === categoryId);
  async function archive(item) {
    if (!window.confirm(`Archive ${item.name}?`)) return;
    try {
      await api(`/api/v1/organizer/candidates/${item.id}`, {
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
      title={selectedCategory ? `${selectedCategory.name} candidates` : "Candidates"}
      description="Manage candidate identity, codes, and category placement."
      action={
        <button
          className="primary-action"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus />
          New candidate
        </button>
      }
    >
      {eventId && <Link className="dashboard-flow-back" to={`/dashboard/categories?eventId=${encodeURIComponent(eventId)}`}><ArrowLeft /> {context.events.find((event) => event.id === eventId)?.name || "Event"} categories</Link>}
      <div className="management-toolbar">
        <label className="toolbar-filter-field">
          <span>Event</span>
          <div className="toolbar-select-control">
            <select
              value={eventId}
              onChange={(event) => setParams(event.target.value ? { eventId: event.target.value } : {})}
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
        <label className="toolbar-filter-field">
          <span>Category</span>
          <div className="toolbar-select-control">
            <select value={categoryId} onChange={(event) => setParams(event.target.value ? { ...(eventId ? { eventId } : {}), categoryId: event.target.value } : eventId ? { eventId } : {})}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <ChevronDown />
          </div>
        </label>
        <span>{visibleItems.length} candidates</span>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      {loading ? (
        <AdminLoading />
      ) : visibleItems.length ? (
        <div className="candidate-table-wrap">
          <table className={`admin-table candidates-table${session.globalRole === "SUPER_ADMIN" ? "" : " candidates-table-single-action"}`}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Code</th>
                <th>Category</th>
                <th>Event</th>
                <th>Votes</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-person">
                      <span className={item.photoUrl ? "has-photo" : ""}>
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          item.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                        )}
                      </span>
                      <strong>{item.name}</strong>
                      <small className="mobile-candidate-context">
                        {item.category.name} · {item.event.name}
                      </small>
                    </div>
                  </td>
                  <td>
                    <b className="table-code">{item.candidateCode}</b>
                  </td>
                  <td>{item.category.name}</td>
                  <td>{item.event.name}</td>
                  <td>{item.cachedVoteCount.toLocaleString()}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-action"
                        title="Edit candidate"
                        onClick={() => setEditingCandidate(item)}
                      >
                        <Pencil />
                      </button>
                      {session.globalRole === "SUPER_ADMIN" && (
                        <button
                          className="table-action"
                          onClick={() => archive(item)}
                          type="button"
                          title="Archive candidate"
                          aria-label={`Archive ${item.name}`}
                        >
                          <Archive />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmpty
          icon={Users}
          title="No candidates yet"
          text={categoryId ? "Add the first candidate to this category." : "Add candidates after creating an event category."}
        />
      )}
      {showForm && (
        <CandidateForm
          events={context.events}
          categories={categories}
          initialEventId={eventId}
          initialCategoryId={categoryId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editingCandidate && (
        <CandidateForm
          item={editingCandidate}
          events={context.events}
          categories={categories}
          onClose={() => setEditingCandidate(null)}
          onCreated={() => {
            setEditingCandidate(null);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}

function CandidateForm({ events, categories, item, initialEventId, initialCategoryId, onClose, onCreated }) {
  const [form, setForm] = useState({
    eventId: item?.eventId || initialEventId || events[0]?.id || "",
    categoryId: item?.categoryId || initialCategoryId || "",
    name: item?.name || "",
    candidateCode: item?.candidateCode || "",
    slogan: item?.slogan || "",
    biography: item?.biography || "",
    photoUrl: item?.photoUrl || "",
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(item?.photoUrl || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );
  const available = categories.filter((item) => item.eventId === form.eventId);
  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let photoUrl = form.photoUrl;
      if (photo) {
        const uploaded = await api("/api/v1/organizer/candidate-images", {
          method: "POST",
          headers: { "Content-Type": photo.type },
          body: photo,
        });
        photoUrl = uploaded.photoUrl;
      }
      await api(
        item
          ? `/api/v1/organizer/candidates/${item.id}`
          : "/api/v1/organizer/candidates",
        {
          method: item ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            ...(item ? { eventId: undefined } : {}),
            photoUrl,
          }),
        },
      );
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }
  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG, or WebP image no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }
  return (
    <Dialog title={item ? "Edit candidate" : "Add candidate"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label
          className={`candidate-photo-upload ${photoPreview ? "has-image" : ""}`}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Candidate preview" />
          ) : (
            <>
              <ImagePlus />
              <strong>Upload candidate photo</strong>
              <small>JPEG, PNG or WebP, up to 5 MB</small>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choosePhoto}
          />
        </label>
        <div className="admin-form-row">
          <label>
            Event
            <select
              value={form.eventId}
              onChange={(event) =>
                setForm({
                  ...form,
                  eventId: event.target.value,
                  categoryId: "",
                })
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
            Category
            <select
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {available.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Candidate name
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
          </label>
          <label>
            Candidate code
            <input
              value={form.candidateCode}
              onChange={(event) =>
                setForm({
                  ...form,
                  candidateCode: event.target.value.toUpperCase(),
                })
              }
              placeholder="EOY04"
              pattern="[A-Z0-9-]{2,20}"
              required
            />
          </label>
        </div>
        <label>
          Slogan
          <input
            value={form.slogan}
            onChange={(event) =>
              setForm({ ...form, slogan: event.target.value })
            }
          />
        </label>
        <label>
          Biography
          <textarea
            rows="4"
            value={form.biography}
            onChange={(event) =>
              setForm({ ...form, biography: event.target.value })
            }
          />
        </label>
        {error && <div className="admin-form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-action"
            type="submit"
            disabled={submitting}
          >
            {submitting && <LoaderCircle className="spin" />}
            {submitting ? "Saving..." : item ? "Save changes" : "Add candidate"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
