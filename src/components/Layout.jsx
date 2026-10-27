
import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { captureAffiliateReferral } from "../store/affiliateTracking";

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const referralCode = params.get("ref");

    if (referralCode) {
      captureAffiliateReferral(referralCode, location.pathname).catch(
        (error) => {
          console.warn("Affiliate referral tracking failed:", error);
        }
      );
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const navItems = [
    { to: "/", label: "Home", end: true },
    { to: "/store", label: "Store", end: false },
    { to: "/services", label: "Services" },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/blog", label: "Blog" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <div className="site">
      <header className="header">
        <div className="container nav">
          <Link
            to="/"
            className="brand"
            aria-label="Valuedam Network home"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="brand-mark">V</span>
            <span>
              Valuedam <b>Network</b>
            </span>
          </Link>

          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>

          <nav
            className={`site-navigation${mobileMenuOpen ? " is-open" : ""}`}
            aria-label="Main navigation"
          >
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    "site-nav-link",
                    label === "Store" ? "store-nav-link" : "",
                    isActive ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}

            <Link
              className="mobile-request-link"
              to="/request-service"
              onClick={() => setMobileMenuOpen(false)}
            >
              Request Service
            </Link>
          </nav>

          <Link
            className="nav-cta desktop-request-link"
            to="/request-service"
          >
            Request Service
          </Link>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-intro">
            <Link to="/" className="brand footer-brand">
              <span className="brand-mark">V</span>
              <span>
                Valuedam <b>Network</b>
              </span>
            </Link>

            <p>
              Connecting, informing, and empowering businesses and individuals
              with useful services, products, and opportunities.
            </p>
          </div>

          <div className="footer-column">
            <h4>Explore</h4>
            <Link to="/store">Store</Link>
            <Link to="/services">Services</Link>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/about">About</Link>
          </div>

          <div className="footer-column">
            <h4>Connect</h4>
            <Link to="/contact">Contact us</Link>
            <Link to="/request-service">Request a service</Link>
            <a
              href="https://valuedam.com.ng/store"
              target="_blank"
              rel="noreferrer"
            >
              Shop Valuedam
            </a>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Valuedam Network. All rights reserved.
          </span>
          <Link to="/store" className="footer-bottom-store">
            Visit Store
          </Link>
        </div>
      </footer>

      <style>{`
        .site-navigation {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .site-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 11px;
          border-radius: 7px;
          color: inherit;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .site-nav-link:hover,
        .site-nav-link.active {
          background: rgba(245, 184, 46, 0.13);
          color: #b77900;
        }

        .site-nav-link.store-nav-link {
          background: #f5b82e;
          color: #171717;
          font-weight: 700;
        }

        .site-nav-link.store-nav-link:hover,
        .site-nav-link.store-nav-link.active {
          background: #e8a90d;
          color: #111827;
        }

        .mobile-menu-toggle,
        .mobile-request-link {
          display: none;
        }

        .desktop-request-link {
          white-space: nowrap;
        }

        .footer-intro p {
          max-width: 340px;
          line-height: 1.8;
        }

        .footer-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .footer-column h4 {
          margin: 0 0 5px;
        }

        .footer-column a {
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-column a:hover,
        .footer-bottom-store:hover {
          color: #f5b82e;
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .footer-bottom-store {
          color: inherit;
          text-decoration: none;
          font-weight: 700;
          white-space: nowrap;
        }

        @media (max-width: 1100px) {
          .site-navigation {
            gap: 2px;
          }

          .site-nav-link {
            padding: 9px 7px;
            font-size: 12px;
          }

          .desktop-request-link {
            padding: 10px 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 900px) {
          .header .nav {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .mobile-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 64px;
            min-height: 40px;
            padding: 8px 12px;
            border: 1px solid rgba(128, 128, 128, 0.3);
            border-radius: 7px;
            background: transparent;
            color: inherit;
            font: inherit;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .site-navigation {
            position: absolute;
            z-index: 1000;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            display: none;
            align-items: stretch;
            flex-direction: column;
            gap: 4px;
            padding: 10px;
            border: 1px solid rgba(128, 128, 128, 0.2);
            border-radius: 10px;
            background: #ffffff;
            color: #202020;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
          }

          .site-navigation.is-open {
            display: flex;
          }

          .site-nav-link {
            justify-content: flex-start;
            width: 100%;
            box-sizing: border-box;
            padding: 12px;
            border-radius: 6px;
            color: #202020;
            font-size: 14px;
          }

          .site-nav-link.store-nav-link {
            justify-content: flex-start;
          }

          .desktop-request-link {
            display: none;
          }

          .mobile-request-link {
            display: block;
            margin-top: 4px;
            padding: 12px;
            border-radius: 6px;
            background: #171717;
            color: #ffffff;
            text-decoration: none;
            font-weight: 700;
          }

          .footer-grid {
            grid-template-columns: 1fr 1fr;
          }

          .footer-intro {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 520px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 26px 18px;
          }

          .footer-intro {
            grid-column: 1 / -1;
          }

          .footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
