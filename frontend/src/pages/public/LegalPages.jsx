import { CreditCard, Mail, MessageCircle, Phone, ShieldCheck, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicShell as Shell } from '../../components/layout/PublicShell.jsx';

export function PlaceholderPage() {
  return (
    <Shell>
      <section className="message-page">
        <Trophy />
        <h1>Coming next</h1>
        <p>This route will be connected in the next frontend phase.</p>
        <Link className="primary-button" to="/events">
          Explore events
        </Link>
      </section>
    </Shell>
  );
}

const SUPPORT_EMAIL = 'support@toabapa.com';

export function ContactPage() {
  return (
    <Shell>
      <section className="contact-page">
        <header>
          <span className="eyebrow">Contact us</span>
          <h1>How can we help?</h1>
          <p>
            Tell us what happened and include the details that will help us
            investigate quickly.
          </p>
        </header>
        <div className="contact-layout">
          <div className="contact-guidance">
            <article>
              <MessageCircle />
              <div>
                <h2>WhatsApp</h2>
                <p>Chat with our support team on WhatsApp.</p>
                <a
                  href="https://wa.me/233207175809"
                  target="_blank"
                  rel="noreferrer"
                >
                  +233 20 717 5809
                </a>
              </div>
            </article>
            <article>
              <Phone />
              <div>
                <h2>Call us</h2>
                <p>Call our support line for direct assistance.</p>
                <a href="tel:+233546534902">+233 54 653 4902</a>
              </div>
            </article>
            <article>
              <Mail />
              <div>
                <h2>Email support</h2>
                <p>For platform access, account, or general support.</p>
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
            </article>
            <article>
              <CreditCard />
              <div>
                <h2>Payment or voting issue</h2>
                <p>
                  Include the event, candidate, mobile number used, payment
                  reference, and approximate transaction time.
                </p>
              </div>
            </article>
            <article>
              <ShieldCheck />
              <div>
                <h2>Event-specific questions</h2>
                <p>
                  Contact the event organizer directly for eligibility, prizes,
                  results, refunds, or event rules.
                </p>
              </div>
            </article>
          </div>
          <form
            className="contact-form"
            action={`mailto:${SUPPORT_EMAIL}`}
            method="post"
            encType="text/plain"
          >
            <h2>Send a message</h2>
            <p>This form opens your email app with the details you provide.</p>
            <label>
              Your name
              <input name="name" autoComplete="name" required />
            </label>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Subject
              <select name="subject" defaultValue="General support">
                <option>General support</option>
                <option>Payment or voting issue</option>
                <option>Organizer account</option>
                <option>Privacy request</option>
              </select>
            </label>
            <label>
              Message
              <textarea name="message" rows="6" required />
            </label>
            <button className="primary-action" type="submit">
              <Mail /> Send message
            </button>
          </form>
        </div>
      </section>
    </Shell>
  );
}

export function PrivacyPage() {
  return (
    <Shell>
      <article className="legal-page">
        <header>
          <span className="eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p>Last updated: 11 August 2026</p>
        </header>
        <section>
          <h2>Information we collect</h2>
          <p>
            When you vote, we collect your mobile number, nominee selection,
            vote quantity, payment reference, payment status, voting channel,
            and transaction timestamps. We do not collect your Mobile Money PIN.
          </p>
          <p>
            Organizer accounts provide identity, contact, organization, event,
            category, contestant, and uploaded image information.
          </p>
        </section>
        <section>
          <h2>How we use information</h2>
          <p>
            We use this information to create vote orders, process and verify
            payments, credit votes, prevent duplicate transactions, display
            permitted results, support organizers, investigate problems, and
            protect the platform from misuse.
          </p>
        </section>
        <section>
          <h2>Payment providers</h2>
          <p>
            Payments are processed by third-party providers such as Paystack.
            They receive the information required to authorize and verify a
            transaction and handle payment credentials under their own privacy
            terms.
          </p>
        </section>
        <section>
          <h2>USSD voting</h2>
          <p>
            USSD requests include a temporary session identifier, mobile number,
            network, and menu input. Session data is used to complete the flow
            and expires after inactivity. Payment confirmation remains
            independent of the USSD session.
          </p>
        </section>
        <section>
          <h2>Sharing and disclosure</h2>
          <p>
            We share data with payment, mobile-network, messaging, hosting, and
            infrastructure providers only as needed to operate Toabapa. We may
            disclose information where required by law or to address fraud,
            security, or legal claims.
          </p>
        </section>
        <section>
          <h2>Retention and security</h2>
          <p>
            Transaction and audit records may be retained to reconcile votes,
            resolve disputes, meet legal obligations, and protect platform
            integrity. We use access controls, organization isolation, payment
            verification, and audit records, but no online service can guarantee
            absolute security.
          </p>
        </section>
        <section>
          <h2>Your choices</h2>
          <p>
            You may contact the relevant event organizer about event-submitted
            information or contact Toabapa regarding platform data. Some
            transaction records cannot be deleted immediately where they are
            required for financial reconciliation, fraud prevention, or legal
            compliance.
          </p>
        </section>
        <section>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as the service changes. The effective date
            above will be revised when material updates are published.
          </p>
        </section>
      </article>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell>
      <article className="legal-page">
        <header>
          <span className="eyebrow">Legal</span>
          <h1>Terms &amp; Conditions</h1>
          <p>Effective date: 15 October 2026</p>
        </header>
        <section>
          <h2>1. Acceptance and scope</h2>
          <p>
            These terms govern access to the Toabapa website, organizer
            dashboard, voting, USSD, payment, results, and related support
            services. By creating an account, publishing an event, initiating a
            payment, or submitting a vote, you agree to these terms and our{' '}
            <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do
            not use the service.
          </p>
        </section>
        <section>
          <h2>2. Accounts and security</h2>
          <p>
            Accounts must be created and operated by real people acting for
            themselves or an organization they are authorized to represent.
            You must provide accurate information, protect your password and
            verification codes, and promptly tell us about suspected
            unauthorized access. You are responsible for activity performed
            through your account except where applicable law provides
            otherwise. Automated or bot-created accounts are prohibited.
          </p>
        </section>
        <section>
          <h2>3. Voting and event rules</h2>
          <p>
            Event organizers configure voting periods, vote prices, permitted
            quantities, contestant eligibility, result visibility, prizes, and
            other event rules. Review the selected event, category, candidate,
            vote quantity, and total charge before authorizing payment. A vote
            is credited only after Toabapa independently verifies a successful
            payment with the payment provider. Attempted, abandoned, pending,
            or failed payments do not create valid votes.
          </p>
        </section>
        <section>
          <h2>4. Payments, charges, and taxes</h2>
          <p>
            Toabapa currently uses third-party payment services, including
            Paystack. Payment credentials and Mobile Money PINs are entered with
            the relevant provider or mobile network and are not collected by
            Toabapa. You may use only a payment method you are authorized to
            use. Displayed charges are payable in the currency shown at
            checkout. Any tax, levy, network charge, or duty required by law is
            the responsibility of the party on whom it is imposed.
          </p>
        </section>
        <section>
          <h2>5. Refunds, reversals, and disputes</h2>
          <p>
            A verified vote is normally final because it is promptly added to
            the event tally. A refund, reversal, cancellation, or vote
            correction may be considered when required by law or after review
            of duplicate charges, provider errors, unauthorized transactions,
            cancelled events, or other exceptional circumstances. Approval is
            not automatic and may require confirmation from the organizer and
            payment provider. Contact us promptly with the event name, mobile
            number used, transaction time, amount, and payment reference.
          </p>
        </section>
        <section>
          <h2>6. Organizer responsibilities</h2>
          <p>
            Organizers are responsible for lawful event operation, accurate
            event and contestant information, permissions for uploaded content,
            published rules, prizes, result settings, and responding to
            participant or voter disputes. Organizers must not manipulate votes
            or misuse personal information. Organizers must have a lawful basis
            for supplying candidate, administrator, and voter information and
            must use it only for legitimate event administration.
          </p>
          <p>
            To operate an event, Toabapa may record votes, validate payments,
            calculate totals, publish results according to the selected
            visibility settings, send operational messages, and investigate the
            validity of transactions. Our handling of that information is
            described in the Privacy Policy.
          </p>
        </section>
        <section>
          <h2>7. Prohibited conduct</h2>
          <p>
            You may not interfere with the service, automate unauthorized
            voting, exploit payment or USSD flows, impersonate others, upload
            unlawful content, attempt to access another organization, or use
            Toabapa for fraudulent activity. You must not introduce malicious
            code, overwhelm the platform, send spam, evade security controls,
            reverse engineer restricted parts of the service, or use Toabapa in
            violation of applicable law or another person's rights.
          </p>
        </section>
        <section>
          <h2>8. Suspension and termination</h2>
          <p>
            We may restrict, suspend, or terminate an account, event, payment
            flow, or access to the service when reasonably necessary to address
            suspected fraud, security threats, non-payment, unlawful content,
            breached event rules, legal requirements, or violations of these
            terms. Where practical and lawful, we will provide notice and an
            opportunity to contact support. Obligations concerning payments,
            records, intellectual property, liability, and disputes survive
            termination where their nature requires it.
          </p>
        </section>
        <section>
          <h2>9. Service availability and changes</h2>
          <p>
            Voting may be unavailable because of schedules, organizer
            suspension, maintenance, network interruption, or third-party
            provider failure. We may limit or suspend access to protect users,
            transactions, and platform integrity. We may change features,
            supported payment methods, platform charges, or service
            availability. Material price changes will not alter a charge you
            already authorized.
          </p>
        </section>
        <section>
          <h2>10. Content and intellectual property</h2>
          <p>
            Toabapa software, branding, and platform materials remain the
            property of Toabapa or their respective licensors and may not be
            copied, sold, sublicensed, or exploited without permission.
            Organizers and users retain ownership of content they submit and
            grant Toabapa a non-exclusive, worldwide, royalty-free licence to
            host, reproduce, resize, display, and transmit that content only as
            needed to operate, secure, promote, and support the relevant event
            and service. You confirm that you have the rights required to grant
            this licence.
          </p>
        </section>
        <section>
          <h2>11. Disclaimers</h2>
          <p>
            The service is provided on an “as available” basis. We use
            reasonable care to protect transactions and calculate results, but
            do not promise uninterrupted access or that every network, mobile
            operator, payment provider, organizer, or device will function
            without delay or error. Organizers, not Toabapa, are responsible for
            event eligibility decisions, awards, prizes, and fulfilment of
            event-specific promises.
          </p>
        </section>
        <section>
          <h2>12. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Toabapa is not liable for
            indirect, incidental, special, punitive, or consequential loss, or
            for lost profits, opportunities, goodwill, or data resulting from
            use of the service. Toabapa is not responsible for organizer
            decisions, event outcomes, prizes, contestant disputes,
            telecommunications failures, or circumstances outside reasonable
            platform control. Nothing in these terms excludes liability that
            cannot lawfully be excluded or limits rights granted by applicable
            consumer-protection law.
          </p>
        </section>
        <section>
          <h2>13. Governing law and disputes</h2>
          <p>
            These terms are governed by the laws of the Republic of Ghana. If a
            dispute arises, contact us first so the parties can attempt to
            resolve it in good faith. If it cannot be resolved informally, the
            courts of competent jurisdiction in Ghana may determine the dispute,
            subject to any mandatory rights or procedures that apply to you.
          </p>
        </section>
        <section>
          <h2>14. Changes, severability, and contact</h2>
          <p>
            We may update these terms as the platform changes. We will revise
            the effective date and provide reasonable notice of material
            changes. Continued use after revised terms take effect constitutes
            acceptance, subject to applicable law. If one provision is held
            unenforceable, the remaining provisions continue in effect. A delay
            in enforcing a provision is not a waiver. These terms and the
            policies they link to form the agreement governing use of Toabapa.
          </p>
          <p>
            Questions or disputes may be sent to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, by WhatsApp
            at <a href="https://wa.me/233207175809">+233 20 717 5809</a>, or by
            telephone at <a href="tel:+233546534902">+233 54 653 4902</a>.
          </p>
        </section>
      </article>
    </Shell>
  );
}


