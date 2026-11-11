import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Archive,
  ArrowRight,
  CalendarDays,
  CirclePause,
  Clock3,
  ImagePlus,
  LoaderCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "./adminApi.js";
import {
  AdminLayout,
  Dialog,
  AdminLoading,
  AdminEmpty,
} from "./AdminShell.jsx";

export function DashboardOverview({ session }) {
  const [state, setState] = useState({ events: [], loading: true, error: "" });
  useEffect(() => {
    api("/api/v1/organizer/context")
      .then((data) =>
        setState({ events: data.events || [], loading: false, error: "" }),
      )
      .catch((error) =>
        setState({ events: [], loading: false, error: error.message }),
      );
  }, []);

  const activeEvents = state.events.filter(
    (event) => event.status === "ACTIVE",
  );
  const pausedEvents = state.events.filter(
    (event) => event.status === "PAUSED",
  );
  const plannedEvents = state.events.filter((event) =>
    ["DRAFT", "SCHEDULED"].includes(event.status),
  );
  const recentEvents = [...state.events]
    .sort((first, second) => new Date(second.startAt) - new Date(first.startAt))
    .slice(0, 3);

  const metrics = [
    { label: "Total events", value: state.events.length, icon: CalendarDays },
    { label: "Active voting", value: activeEvents.length, icon: Activity },
    { label: "Paused", value: pausedEvents.length, icon: CirclePause },
    { label: "Planned", value: plannedEvents.length, icon: Clock3 },
  ];

  return (
    <AdminLayout
      session={session}
      title="Overview"
      description="A quick view of event activity across your organization."
      action={
        <Link className="primary-action" to="/dashboard/events/new">
          <Plus /> New event
        </Link>
      }
    >
      {state.error && <div className="admin-alert">{state.error}</div>}
      {state.loading ? (
        <AdminLoading type="cards" />
      ) : (
        <>
          <section className="overview-metrics" aria-label="Event summary">
            {metrics.map(({ label, value, icon: Icon }) => (
              <article className="overview-metric-card" key={label}>
                <span>
                  <Icon />
                </span>
                <div>
                  <strong>{value}</strong>
                  <small>{label}</small>
                </div>
              </article>
            ))}
          </section>

          <section className="overview-recent-events">
            <header>
              <div>
                <span>Recent activity</span>
                <h2>Latest events</h2>
              </div>
              <Link to="/dashboard/events">
                Manage all events <ArrowRight />
              </Link>
            </header>
            {recentEvents.length ? (
              <div className="overview-event-list">
                {recentEvents.map((event) => (
                  <article key={event.id}>
                    <span
                      className={`event-state ${event.status.toLowerCase()}`}
                    >
                      {event.status}
                    </span>
                    <div>
                      <h3>{event.name}</h3>
                      <p>
                        {new Date(event.startAt).toLocaleDateString()} –{" "}
                        {new Date(event.endAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      to="/dashboard/events"
                      aria-label={`Manage ${event.name}`}
                    >
                      <ArrowRight />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <AdminEmpty
                icon={CalendarDays}
                title="No events yet"
                text="Create your first event to begin tracking activity here."
              />
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}

export function EventsManagementPage({ session }) {
  const [state, setState] = useState({
    events: [],
    loading: true,
    error: "",
    pendingId: "",
  });
  const [editing, setEditing] = useState(null);
  const loadEvents = useCallback(() => {
    api("/api/v1/organizer/context")
      .then((data) =>
        setState((current) => ({
          ...current,
          events: data.events,
          loading: false,
          error: "",
        })),
      )
      .catch((error) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        })),
      );
  }, []);
  useEffect(loadEvents, [loadEvents]);

  async function changeVotingStatus(event) {
    const action = event.status === "PAUSED" ? "resume" : "pause";
    setState((current) => ({ ...current, pendingId: event.id, error: "" }));
    try {
      const updated = await api(
        `/api/v1/organizer/events/${event.id}/voting-status`,
        {
          method: "PATCH",
          body: JSON.stringify({ action }),
        },
      );
      setState((current) => ({
        ...current,
        pendingId: "",
        events: current.events.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item,
        ),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        pendingId: "",
        error: error.message,
      }));
    }
  }

  async function archiveEvent(event) {
    if (
      !window.confirm(
        `Archive ${event.name}? It will no longer appear publicly.`,
      )
    )
      return;
    setState((current) => ({ ...current, pendingId: event.id, error: "" }));
    try {
      await api(`/api/v1/organizer/events/${event.id}`, { method: "DELETE" });
      setState((current) => ({
        ...current,
        pendingId: "",
        events: current.events.filter((item) => item.id !== event.id),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        pendingId: "",
        error: error.message,
      }));
    }
  }

  return (
    <AdminLayout
      session={session}
      title="Events"
      description="Manage event details, publishing assets, and voting availability."
      action={
        <Link className="primary-action" to="/dashboard/events/new">
          <Plus /> New event
        </Link>
      }
    >
      {state.error && <div className="admin-alert">{state.error}</div>}
      {state.loading ? (
        <AdminLoading type="cards" />
      ) : state.events.length ? (
        <div className="management-grid event-card-grid">
          {state.events.map((event) => {
            const controllable =
              event.status === "ACTIVE" || event.status === "PAUSED";
            return (
              <article
                className="management-card admin-event-card"
                key={event.id}
              >
                <div
                  className={`admin-event-banner ${event.bannerUrl ? "has-banner" : ""}`}
                >
                  {event.bannerUrl ? (
                    <img
                      src={event.bannerUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <CalendarDays />
                  )}
                  <span className={`event-state ${event.status.toLowerCase()}`}>
                    {event.status}
                  </span>
                </div>
                <div className="admin-event-content">
                  <span>
                    {new Date(event.startAt).toLocaleDateString()} -{" "}
                    {new Date(event.endAt).toLocaleDateString()}
                  </span>
                  <h2>{event.name}</h2>
                  <p>{event.description || "No event description added."}</p>
                </div>
                <footer className="admin-event-actions">
                  <button
                    className="icon-action"
                    type="button"
                    title="Edit event details"
                    onClick={() => setEditing(event)}
                  >
                    <Pencil />
                  </button>
                  {controllable && (
                    <button
                      className={
                        event.status === "PAUSED"
                          ? "primary-action"
                          : "suspend-action"
                      }
                      type="button"
                      disabled={state.pendingId === event.id}
                      onClick={() => changeVotingStatus(event)}
                    >
                      {state.pendingId === event.id ? (
                        <LoaderCircle className="spin" />
                      ) : event.status === "PAUSED" ? (
                        <PlayCircle />
                      ) : (
                        <PauseCircle />
                      )}
                      {event.status === "PAUSED"
                        ? "Resume voting"
                        : "Pause voting"}
                    </button>
                  )}
                  <button
                    className="icon-action event-archive"
                    type="button"
                    title="Archive event"
                    disabled={
                      state.pendingId === event.id || event.status === "ACTIVE"
                    }
                    onClick={() => archiveEvent(event)}
                  >
                    <Archive />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmpty
          icon={CalendarDays}
          title="No events yet"
          text="Create an event to manage voting availability."
        />
      )}
      {editing && (
        <EventEditForm
          event={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadEvents();
          }}
        />
      )}
    </AdminLayout>
  );
}

function RecoveryPhonePanel({ initialPhone, onPhoneUpdated }) {
  const [open, setOpen] = useState(!initialPhone);
  const [phone, setPhone] = useState(initialPhone);
  const [currentPhone, setCurrentPhone] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState({
    loading: false,
    error: "",
    saved: false,
  });
  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: "", saved: false });
    try {
      const updated = await api("/api/v1/auth/me/phone", {
        method: "PATCH",
        body: JSON.stringify({
          phone: newPhone,
          currentPhone: phone ? currentPhone : undefined,
          password,
        }),
      });
      setPhone(updated.phone);
      onPhoneUpdated?.(updated.phone);
      setCurrentPhone("");
      setNewPhone("");
      setPassword("");
      setOpen(false);
      setState({ loading: false, error: "", saved: true });
    } catch (error) {
      setState({ loading: false, error: error.message, saved: false });
    }
  }
  return (
    <section className="recovery-phone-panel">
      <div>
        <small>Password recovery</small>
        <strong>
          {phone
            ? `SMS recovery: ${phone.replace(/.(?=.{4})/g, "•")}`
            : "Add a recovery phone"}
        </strong>
      </div>
      {!open && (
        <button
          className="secondary-action"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Pencil /> {phone ? "Change" : "Add phone"}
        </button>
      )}
      {open && (
        <form onSubmit={submit}>
          {phone && (
            <label className="settings-field" htmlFor="current-recovery-phone">
              <span>Current full phone number</span>
              <input
                id="current-recovery-phone"
                type="tel"
                autoComplete="tel"
                value={currentPhone}
                onChange={(event) => setCurrentPhone(event.target.value)}
                placeholder="Enter the complete current number"
                aria-describedby={
                  state.error ? "recovery-phone-error" : undefined
                }
                required
              />
            </label>
          )}
          <label className="settings-field" htmlFor="new-recovery-phone">
            <span>{phone ? "New phone number" : "Recovery phone number"}</span>
            <input
              id="new-recovery-phone"
              type="tel"
              autoComplete="tel"
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
              placeholder="For example, 024 123 4567"
              aria-describedby={
                state.error ? "recovery-phone-error" : undefined
              }
              required
            />
          </label>
          <label className="settings-field" htmlFor="recovery-password">
            <span>Current password</span>
            <input
              id="recovery-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={
                state.error ? "recovery-phone-error" : undefined
              }
              required
            />
          </label>
          <button
            className="primary-action"
            type="submit"
            disabled={state.loading}
          >
            {state.loading ? <LoaderCircle className="spin" /> : "Save phone"}
          </button>
          {phone && (
            <button
              className="secondary-action"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          )}
        </form>
      )}
      {state.error && (
        <span id="recovery-phone-error" className="recovery-error" role="alert">
          {state.error}
        </span>
      )}
      {state.saved && (
        <span className="recovery-saved">Recovery phone updated.</span>
      )}
    </section>
  );
}

export function SettingsPage({ session }) {
  const [phone, setPhone] = useState(session.user.phone || "");
  return (
    <AdminLayout
      session={session}
      title="Settings"
      description="Manage account recovery and organizer sign-in security."
    >
      <div className="settings-sections">
        <RecoveryPhonePanel initialPhone={phone} onPhoneUpdated={setPhone} />
        <MfaPanel
          enabledInitially={Boolean(session.user.twoFactorEnabled)}
          hasPhone={Boolean(phone)}
        />
      </div>
    </AdminLayout>
  );
}

function MfaPanel({ enabledInitially, hasPhone }) {
  const [enabled, setEnabled] = useState(enabledInitially);
  const [mode, setMode] = useState("idle");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });
  async function begin(event) {
    event.preventDefault();
    setState({ loading: true, error: "" });
    try {
      const data = await api("/api/v1/auth/mfa/setup", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setChallengeId(data.challengeId);
      setPassword("");
      setMode("verify");
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function enable(event) {
    event.preventDefault();
    setState({ loading: true, error: "" });
    try {
      await api("/api/v1/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ challengeId, otp }),
      });
      setEnabled(true);
      setMode("idle");
      setOtp("");
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function disable(event) {
    event.preventDefault();
    setState({ loading: true, error: "" });
    try {
      await api("/api/v1/auth/mfa", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      window.location.assign("/organizers");
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  return (
    <section className="recovery-phone-panel">
      <div>
        <small>Account security</small>
        <strong>
          {enabled
            ? "Two-factor authentication enabled"
            : "Action required: enable two-factor authentication"}
        </strong>
      </div>
      {mode === "idle" && (
        <button
          className={enabled ? "secondary-action" : "primary-action"}
          type="button"
          disabled={!hasPhone}
          onClick={() => setMode(enabled ? "disable" : "password")}
        >
          {enabled ? "Disable MFA" : "Enable MFA now"}
        </button>
      )}
      {mode === "password" && (
        <form onSubmit={begin}>
          <label className="settings-field" htmlFor="mfa-enable-password">
            <span>Current password</span>
            <input
              id="mfa-enable-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={state.error ? "mfa-error" : undefined}
              required
            />
          </label>
          <button className="primary-action" disabled={state.loading}>
            Send code
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setMode("idle")}
          >
            Cancel
          </button>
        </form>
      )}
      {mode === "verify" && (
        <form onSubmit={enable}>
          <label className="settings-field" htmlFor="mfa-verification-code">
            <span>Six-digit verification code</span>
            <input
              id="mfa-verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength="6"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              aria-describedby={state.error ? "mfa-error" : undefined}
              required
            />
          </label>
          <button className="primary-action" disabled={state.loading}>
            Verify
          </button>
        </form>
      )}
      {mode === "disable" && (
        <form onSubmit={disable}>
          <label className="settings-field" htmlFor="mfa-disable-password">
            <span>Current password</span>
            <input
              id="mfa-disable-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={state.error ? "mfa-error" : undefined}
              required
            />
          </label>
          <button className="suspend-action" disabled={state.loading}>
            Disable MFA
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setMode("idle")}
          >
            Cancel
          </button>
        </form>
      )}
      {!hasPhone && (
        <span className="recovery-error">
          Add a trusted recovery phone before enabling MFA.
        </span>
      )}
      {state.error && (
        <span id="mfa-error" className="recovery-error" role="alert">
          {state.error}
        </span>
      )}
    </section>
  );
}

function EventEditForm({ event, onClose, onSaved }) {
  const datePart = (value) => new Date(value).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    name: event.name,
    description: event.description || "",
    startAt: datePart(event.startAt),
    endAt: datePart(event.endAt),
    timezone: event.timezone,
    currency: event.currency,
    defaultVotePrice: String(event.defaultVotePrice / 100),
    platformFeePercent: String(event.platformFeeBps / 100),
    minimumVotes: String(event.minimumVotes),
    webVotingEnabled: event.webVotingEnabled,
    ussdVotingEnabled: event.ussdVotingEnabled,
    resultsVisibility: event.resultsVisibility,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(event.bannerUrl || "");
  useEffect(
    () => () => {
      if (bannerPreview.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
    },
    [bannerPreview],
  );
  function selectBanner(file) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG, or WebP banner no larger than 5 MB.");
      return;
    }
    setError("");
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }
  async function submit(submitEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    setError("");
    try {
      let bannerUrl = event.bannerUrl;
      if (bannerFile) {
        const uploaded = await api("/api/v1/organizer/event-images", {
          method: "POST",
          headers: { "Content-Type": bannerFile.type },
          body: bannerFile,
        });
        bannerUrl = uploaded.bannerUrl;
      }
      await api(`/api/v1/organizer/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          platformFeePercent: undefined,
          platformFeeBps: Math.round(Number(form.platformFeePercent) * 100),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          defaultVotePrice: Math.round(Number(form.defaultVotePrice) * 100),
          minimumVotes: Number(form.minimumVotes),
          bannerUrl,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }
  return (
    <Dialog title="Edit event" onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label className="event-edit-banner-field">
          Event banner
          <span className="event-edit-banner-preview">
            {bannerPreview ? (
              <img src={bannerPreview} alt="Event banner preview" />
            ) : (
              <ImagePlus />
            )}
          </span>
          <span className="event-edit-banner-action">
            <ImagePlus />
            {bannerPreview ? "Change banner" : "Add banner"}
          </span>
          <input
            className="event-edit-banner-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(input) => selectBanner(input.target.files?.[0])}
            disabled={saving}
          />
          <small>JPEG, PNG, or WebP. Maximum size 5 MB.</small>
        </label>
        <label>
          Event name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Description
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className="admin-form-row">
          <label>
            Starts
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              required
            />
          </label>
          <label>
            Ends
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Currency
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option>GHS</option>
              <option>NGN</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            Price per vote
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.defaultVotePrice}
              onChange={(e) =>
                setForm({ ...form, defaultVotePrice: e.target.value })
              }
              required
            />
          </label>
        </div>
        <label>
          Platform fee (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.platformFeePercent}
            onChange={(e) =>
              setForm({ ...form, platformFeePercent: e.target.value })
            }
            required
          />
        </label>
        <label>
          Minimum votes
          <input
            type="number"
            min="1"
            value={form.minimumVotes}
            onChange={(e) => setForm({ ...form, minimumVotes: e.target.value })}
            required
          />
        </label>
        <div className="admin-form-row">
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.webVotingEnabled}
              onChange={(e) =>
                setForm({ ...form, webVotingEnabled: e.target.checked })
              }
            />{" "}
            Web voting
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.ussdVotingEnabled}
              onChange={(e) =>
                setForm({ ...form, ussdVotingEnabled: e.target.checked })
              }
            />{" "}
            USSD voting
          </label>
        </div>
        <label>
          Results visibility
          <select
            value={form.resultsVisibility}
            onChange={(e) =>
              setForm({ ...form, resultsVisibility: e.target.value })
            }
          >
            {[
              "EXACT_TOTALS",
              "PERCENTAGES",
              "RANKING_ONLY",
              "HIDDEN_UNTIL_END",
              "ADMIN_ONLY",
              "MANUAL_RELEASE",
            ].map((value) => (
              <option key={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        {error && <div className="admin-form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action" disabled={saving} type="submit">
            {saving && <LoaderCircle className="spin" />} Save changes
          </button>
        </div>
      </form>
    </Dialog>
  );
}
