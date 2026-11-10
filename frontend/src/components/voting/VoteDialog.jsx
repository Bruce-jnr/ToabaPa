import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  X,
} from 'lucide-react';

export function VoteDialog({ candidate, event, onClose }) {
  const quickVotes = [1, 5, 10, 20, 50, 100, 500];
  const [quantity, setQuantity] = useState(
    Math.max(1, event.minimumVotes || 1),
  );
  const [custom, setCustom] = useState('');
  const [contact, setContact] = useState({ phone: '' });
  const [order, setOrder] = useState(null);
  const [state, setState] = useState({
    phase: 'details',
    loading: false,
    error: '',
  });

  useEffect(() => {
    function closeOnEscape(keyEvent) {
      if (keyEvent.key === 'Escape' && !state.loading) onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, state.loading]);

  function chooseQuantity(value) {
    setQuantity(value);
    setCustom('');
    setState((current) => ({ ...current, error: '' }));
  }
  function setCustomQuantity(value) {
    setCustom(value);
    setQuantity(Number(value));
    setState((current) => ({ ...current, error: '' }));
  }

  async function createOrder(formEvent) {
    formEvent.preventDefault();
    if (
      !Number.isInteger(quantity) ||
      quantity < event.minimumVotes ||
      quantity > event.maximumVotesPerTransaction
    ) {
      setState({
        phase: 'details',
        loading: false,
        error: `Choose between ${event.minimumVotes} and ${event.maximumVotesPerTransaction} votes.`,
      });
      return;
    }
    setState({ phase: 'details', loading: true, error: '' });
    try {
      const response = await fetch('/api/v1/vote-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          quantity,
          phone: contact.phone,
          channel: 'WEB',
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(
          payload?.error?.message || 'Unable to create vote order.',
        );
      setOrder(payload.data);
      setState({ phase: 'review', loading: false, error: '' });
    } catch (error) {
      setState({ phase: 'details', loading: false, error: error.message });
    }
  }

  async function pay() {
    setState({ phase: 'review', loading: true, error: '' });
    try {
      const response = await fetch(
        `/api/v1/payments/${encodeURIComponent(order.paymentReference)}/initialize`,
        { method: 'POST' },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(
          payload?.error?.message || 'Unable to initialize payment.',
        );
      window.location.assign(payload.data.authorizationUrl);
    } catch (error) {
      setState({ phase: 'review', loading: false, error: error.message });
    }
  }

  return (
    <div
      className="vote-dialog-backdrop"
      role="presentation"
      onMouseDown={(mouseEvent) =>
        mouseEvent.target === mouseEvent.currentTarget &&
        !state.loading &&
        onClose()
      }
    >
      <section
        className="vote-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-dialog-title"
      >
        <header>
          <div>
            <span>{candidate.candidateCode}</span>
            <h2 id="vote-dialog-title">Vote for {candidate.name}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={state.loading}
            aria-label="Close voting form"
          >
            <X />
          </button>
        </header>
        {state.phase === 'details' ? (
          <form onSubmit={createOrder}>
            <div className="vote-candidate-summary">
              <div>
                {candidate.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <span>
                <small>{candidate.category.name}</small>
                <strong>{candidate.name}</strong>
              </span>
            </div>
            <fieldset className="vote-quantity">
              <legend>How many votes?</legend>
              <div>
                {quickVotes.map((value) => (
                  <button
                    className={quantity === value && !custom ? 'active' : ''}
                    onClick={() => chooseQuantity(value)}
                    type="button"
                    key={value}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label>
                Custom quantity
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={custom}
                  onChange={(inputEvent) =>
                    setCustomQuantity(inputEvent.target.value)
                  }
                  placeholder="Enter votes"
                />
              </label>
            </fieldset>
            <div className="vote-contact single">
              <label>
                Mobile number
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(inputEvent) =>
                    setContact({ phone: inputEvent.target.value })
                  }
                  placeholder="+233 20 000 0000"
                  minLength="7"
                  maxLength="20"
                  required
                />
              </label>
            </div>
            {state.error && (
              <div className="vote-error">
                <AlertCircle />
                {state.error}
              </div>
            )}
            <footer>
              <div>
                <small>Estimated total</small>
                <strong>
                  {event.currency}{' '}
                  {(((quantity || 0) * event.defaultVotePrice) / 100).toFixed(
                    2,
                  )}
                </strong>
              </div>
              <button
                className="primary-action"
                disabled={state.loading}
                type="submit"
              >
                {state.loading ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <ArrowRight />
                )}
                Review votes
              </button>
            </footer>
          </form>
        ) : (
          <div className="vote-review">
            <div className="review-check">
              <CheckCircle2 />
            </div>
            <span className="eyebrow">Confirm your vote</span>
            <h3>
              {order.quantity} votes for {candidate.name}
            </h3>
            <dl>
              <div>
                <dt>Candidate code</dt>
                <dd>{candidate.candidateCode}</dd>
              </div>
              <div>
                <dt>Price per vote</dt>
                <dd>
                  {order.currency} {(order.unitPrice / 100).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt>Total payment</dt>
                <dd>
                  {order.currency} {(order.amount / 100).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{order.paymentReference}</dd>
              </div>
            </dl>
            <p>
              Votes are credited only after the payment is securely confirmed.
            </p>
            {state.error && (
              <div className="vote-error">
                <AlertCircle />
                {state.error}
              </div>
            )}
            <div className="review-actions">
              <button
                className="secondary-action"
                disabled={state.loading}
                onClick={() =>
                  setState({ phase: 'details', loading: false, error: '' })
                }
                type="button"
              >
                Back
              </button>
              <button
                className="primary-action"
                disabled={state.loading}
                onClick={pay}
                type="button"
              >
                {state.loading ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <CreditCard />
                )}
                Pay
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
