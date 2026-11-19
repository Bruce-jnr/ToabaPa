import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck, Smartphone, Vote, WalletCards, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appHref } from '../../lib/siteUrls.js';
import organizerHero from '../../assets/organizer-hero.jpg';
import { PublicShell as Shell } from '../../components/layout/PublicShell.jsx';

const organizerCapabilities = [
  {
    icon: Vote,
    title: 'One voting engine',
    text: 'Web and USSD orders follow the same pricing, payment verification, and vote-crediting rules.',
  },
  {
    icon: WalletCards,
    title: 'Verified payments',
    text: 'Votes are credited only after the provider confirms the expected amount and currency.',
  },
  {
    icon: BarChart3,
    title: 'Useful reporting',
    text: 'Follow vote volume, revenue, candidate performance, payment success, and channel mix.',
  },
  {
    icon: ShieldCheck,
    title: 'Tenant isolation',
    text: 'Organization records and administrative actions are scoped and authorized on the server.',
  },
];

export function HowItWorksPage() {
  return (
    <Shell>
      <section
        className="organizer-hero"
        style={{ backgroundImage: `url(${organizerHero})` }}
      >
        <div className="organizer-hero-content">
          <span className="organizer-kicker">How it works for organizers</span>
          <h1>Run voting with confidence from nomination to results.</h1>
          <p>
            Create your event, manage candidates, accept paid votes, and track
            every verified transaction in one organized workspace.
          </p>
          <div className="organizer-hero-actions">
            <Link className="organizer-primary" to={appHref('/login')}>
              Organizer login <ArrowRight />
            </Link>
            <a className="organizer-secondary" href="#workflow">
              See how it works
            </a>
          </div>
          <div className="organizer-proof">
            <span>
              <CheckCircle2 />
              No voter account required
            </span>
            <span>
              <CheckCircle2 />
              Web and USSD ready
            </span>
            <span>
              <CheckCircle2 />
              Auditable vote ledger
            </span>
          </div>
        </div>
      </section>

      <section className="organizer-intro">
        <div>
          <span className="eyebrow">Your event, under control</span>
          <h2>A practical workspace for serious public voting.</h2>
        </div>
        <p>
          Toabapa keeps event operations, payments, voting channels, results,
          and reporting connected. Your team gets the information needed to run
          the event while voters get a short, clear path to support a candidate.
        </p>
      </section>

      <section className="organizer-capabilities">
        {organizerCapabilities.map(({ icon: Icon, title, text }, index) => (
          <article key={title}>
            <span className="capability-number">0{index + 1}</span>
            <Icon />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="organizer-workflow" id="workflow">
        <div className="workflow-copy">
          <span className="eyebrow">From setup to settlement</span>
          <h2>Everything follows the event lifecycle.</h2>
          <p>
            Build the event in stages, open voting when you are ready, and keep
            financial and vote records traceable after results are announced.
          </p>
          <Link to={appHref('/login')}>
            Open Organizers workspace <ArrowRight />
          </Link>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Configure</strong>
              <p>
                Set schedule, pricing, channels, result visibility, and event
                branding.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Organize</strong>
              <p>
                Add categories, candidates, unique codes, photos, and campaign
                details.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Launch</strong>
              <p>
                Publish the event and let voters discover candidates on web or
                USSD.
              </p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>Measure</strong>
              <p>
                Review verified transactions, channel performance, rankings, and
                reports.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="organizer-channels">
        <div className="channel-heading">
          <span className="eyebrow">Meet voters where they are</span>
          <h2>One event. Multiple voting channels.</h2>
        </div>
        <div className="channel-panels">
          <article className="web-channel">
            <div className="channel-icon">
              <Zap />
            </div>
            <span>Web voting</span>
            <h3>A direct route from discovery to payment.</h3>
            <p>
              Voters search by event, name, or candidate code, select a
              quantity, review the total, and complete payment without creating
              an account.
            </p>
            <ul>
              <li>
                <CheckCircle2 />
                Mobile-first candidate pages
              </li>
              <li>
                <CheckCircle2 />
                Server-calculated prices
              </li>
              <li>
                <CheckCircle2 />
                Payment verification states
              </li>
            </ul>
          </article>
          <article className="ussd-channel">
            <div className="channel-icon">
              <Smartphone />
            </div>
            <span>USSD voting</span>
            <h3>Nominee-code voting beyond the browser.</h3>
            <p>
              The same event rules and vote ledger can serve short-code
              sessions, mobile money requests, and confirmation messages.
            </p>
            <ul>
              <li>
                <CheckCircle2 />
                Fast Nominee-code lookup
              </li>
              <li>
                <CheckCircle2 />
                Session-aware menu flow
              </li>
              <li>
                <CheckCircle2 />
                Shared payment integrity
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="organizer-integrity">
        <div className="integrity-mark">
          <ShieldCheck />
        </div>
        <div>
          <span className="eyebrow">Financial integrity by design</span>
          <h2>A successful payment credits votes once.</h2>
          <p>
            Payment status and vote-processing status remain separate. Verified
            transactions enter an append-oriented ledger, duplicate provider
            callbacks add no extra votes, and candidate totals can be
            reconstructed from transaction history.
          </p>
        </div>
      </section>

      <section className="organizer-final-cta">
        <span className="eyebrow">Prepare your next event</span>
        <h2>Give your team a better way to run public voting.</h2>
        <p>Start with event details, schedule, pricing, and voting channels.</p>
        <Link className="organizer-primary" to={appHref('/login')}>
          Organizer login <ArrowRight />
        </Link>
      </section>
    </Shell>
  );
}
