import { useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useFocusTrap } from "../../lib/useFocusTrap.js";

export function PublicShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useFocusTrap(menuOpen, {
    onEscape: () => setMenuOpen(false),
  });
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Toabapa home">
          <img src={logo} alt="Toabapa" />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/events">Explore</NavLink>
          <NavLink to="/how-it-works">How it works</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="organizer-link" to="/organizers/login">
            For organizers
          </Link>
          <button
            className="icon-button menu-trigger"
            type="button"
            aria-label="Open menu"
            title="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div
          className="mobile-menu-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setMenuOpen(false)
          }
        >
          <aside
            className="mobile-menu-panel"
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex="-1"
            ref={menuRef}
          >
            <header>
              <Link
                to="/"
                aria-label="Toabapa home"
                onClick={() => setMenuOpen(false)}
              >
                <img src={logo} alt="Toabapa" />
              </Link>
              <button
                className="icon-button"
                type="button"
                aria-label="Close menu"
                title="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X />
              </button>
            </header>
            <nav>
              <Link to="/" onClick={() => setMenuOpen(false)}>
                Home <ChevronRight />
              </Link>
              <Link to="/events" onClick={() => setMenuOpen(false)}>
                Explore events <ChevronRight />
              </Link>
              <Link to="/how-it-works" onClick={() => setMenuOpen(false)}>
                How it works <ChevronRight />
              </Link>
              <Link
                to="/events?focus=search"
                onClick={() => setMenuOpen(false)}
              >
                Search <ChevronRight />
              </Link>
              <Link
                className="mobile-organizer-menu-link"
                to="/organizers/login"
                onClick={() => setMenuOpen(false)}
              >
                For organizers <ChevronRight />
              </Link>
              <Link to="/#faq" onClick={() => setMenuOpen(false)}>
                FAQ <ChevronRight />
              </Link>
              <Link to="/privacy" onClick={() => setMenuOpen(false)}>
                Privacy Policy <ChevronRight />
              </Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)}>
                Contact us <ChevronRight />
              </Link>
              <Link to="/terms" onClick={() => setMenuOpen(false)}>
                Terms &amp; Conditions <ChevronRight />
              </Link>
            </nav>
          </aside>
        </div>
      )}
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <Link to="/" aria-label="Toabapa home">
          <img src={logo} alt="Toabapa" />
        </Link>
        <p>&copy; {new Date().getFullYear()} Toabapa. All rights reserved.</p>
        <nav aria-label="Footer navigation">
          <Link to="/events">Explore events</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/organizers/login">For organizers</Link>
          <Link to="/contact">Contact us</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/#faq">FAQ</Link>
        </nav>
      </footer>
    </div>
  );
}
