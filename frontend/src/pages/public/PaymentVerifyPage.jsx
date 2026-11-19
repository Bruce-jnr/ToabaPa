import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicShell as Shell } from '../../components/layout/PublicShell.jsx';
import { getJson } from '../../lib/publicApi.js';
import { marketingHref } from '../../lib/siteUrls.js';

export function PaymentVerifyPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => {
    if (!reference) {
      Promise.resolve().then(() =>
        setState({
          loading: false,
          error: 'Payment reference is missing.',
          data: null,
        }),
      );
      return;
    }
    const controller = new AbortController();
    getJson(
      `/api/v1/payments/${encodeURIComponent(reference)}/verify`,
      controller.signal,
    )
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ loading: false, error: error.message, data: null });
      });
    return () => controller.abort();
  }, [reference]);
  return (
    <Shell>
      <section className="payment-result">
        {state.loading ? (
          <>
            <LoaderCircle className="spin" />
            <span className="eyebrow">Verifying payment</span>
            <h1>Please wait while we confirm your vote.</h1>
            <p>Do not close or refresh this page.</p>
          </>
        ) : state.error ? (
          <>
            <div className="result-icon failed">
              <AlertCircle />
            </div>
            <span className="eyebrow">Payment not confirmed</span>
            <h1>Your votes have not been credited.</h1>
            <p>{state.error}</p>
            <Link className="secondary-action" to={marketingHref('/events')}>
              Return to events
            </Link>
          </>
        ) : (
          <>
            <div className="result-icon success">
              <CheckCircle2 />
            </div>
            <span className="eyebrow">Vote credited</span>
            <h1>Thank you for supporting {state.data.candidate.name}.</h1>
            <p>
              {state.data.quantity} votes were credited successfully. Reference:{' '}
              <strong>{state.data.reference}</strong>
            </p>
            <Link className="primary-action" to={marketingHref('/events')}>
              Explore more events
            </Link>
          </>
        )}
      </section>
    </Shell>
  );
}


