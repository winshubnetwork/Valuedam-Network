
import React, { useEffect, useState } from 'react';
import {
  NavLink,
  useNavigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NAV_SECTIONS = [
  {
    title: 'GENERAL',
    links: [
      { label: 'Dashboard', to: '/admin', end: true, icon: '⌂' },
      { label: 'Homepage', to: '/admin/homepage', icon: '▤' },
      { label: 'Customers', to: '/admin/customers', icon: '♙' },
      { label: 'Services', to: '/admin/services', icon: '◇' },
      { label: 'Portfolio', to: '/admin/portfolio', icon: '▦' },
      { label: 'Testimonials', to: '/admin/testimonials', icon: '☆' },
      { label: 'Service Requests', to: '/admin/requests', icon: '☷' },
      { label: 'Sales Pipeline', to: '/admin/pipeline', icon: '↗' },
      { label: 'Quotes', to: '/admin/quotes', icon: '▧' },
      { label: 'Invoices', to: '/admin/invoices', icon: '▤' },
      { label: 'Payments', to: '/admin/payments', icon: '₦' },
      { label: 'Jobs', to: '/admin/jobs', icon: '▣' },
    ],
  },
  {
    title: 'CONTENT & COMMUNICATION',
    links: [
      { label: 'Blog', to: '/admin/blog', icon: '✎' },
      { label: 'Blog Comments', to: '/admin/blog/comments', icon: '☏' },
      { label: 'Contact Messages', to: '/admin/messages', icon: '✉' },
      { label: 'Blog Categories', to: '/admin/blog/categories', icon: '▤' },
      { label: 'Site Settings', to: '/admin/settings', icon: '⚙' },
    ],
  },
  {
    title: 'VALUEDAM STORE',
    links: [
      { label: 'Store Products', to: '/admin/store/products', icon: '▣' },
      { label: 'Store Orders', to: '/admin/store/orders', icon: '☷' },
      {
        label: 'Payment Settings',
        to: '/admin/store/payment-settings',
        icon: '₦',
      },
    ],
  },
  {
    title: 'AFFILIATE MANAGEMENT',
    links: [
      {
        label: 'Affiliates',
        to: '/admin/store/affiliates',
        icon: '♙',
      },
      {
        label: 'Affiliate Settings',
        to: '/admin/store/affiliates/settings',
        icon: '⚙',
      },
      {
        label: 'Affiliate Rules',
        to: '/admin/store/affiliate-rules',
        icon: '☷',
      },
      {
        label: 'Affiliate Sales',
        to: '/admin/store/affiliate-sales',
        icon: '↗',
      },
      {
        label: 'Affiliate Commissions',
        to: '/admin/store/affiliate-commissions',
        icon: '₦',
      },
      {
        label: 'Recurring Payments',
        to: '/admin/store/affiliate-recurring-payments',
        icon: '⟳',
      },
      {
        label: 'Affiliate Ledger',
        to: '/admin/store/affiliate-ledger',
        icon: '▤',
      },
      {
        label: 'Affiliate Payouts',
        to: '/admin/store/affiliate-payouts',
        icon: '⇄',
      },
    ],
  },
];

export default function AdminShell() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) {
            navigate('/admin/login', { replace: true });
          }
          return;
        }

        const { data: adminProfile, error } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (
          error ||
          !adminProfile?.active ||
          !['admin', 'editor'].includes(adminProfile.role)
        ) {
          await supabase.auth.signOut();

          if (mounted) {
            navigate('/admin/login', { replace: true });
          }
          return;
        }

        if (mounted) {
          setProfile(adminProfile);
          setChecking(false);
        }
      } catch (error) {
        console.error('Admin access check failed:', error);

        if (mounted) {
          navigate('/admin/login', { replace: true });
        }
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Close the mobile navigation after visiting another page.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close the mobile navigation with the Escape key.
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Prevent background page scrolling while the mobile drawer is open.
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  async function logout() {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  }

  if (checking) {
    return (
      <>
        <div className="vd-admin-loading">
          <span className="vd-admin-spinner" />
          <span>Checking administrator access…</span>
        </div>

        <style>{`
          .vd-admin-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 24px;
            background: #f5f7fb;
            color: #344054;
            font: 500 14px/1.5 system-ui, sans-serif;
          }

          .vd-admin-spinner {
            width: 22px;
            height: 22px;
            border: 3px solid #e3e7ee;
            border-top-color: #f5b82e;
            border-radius: 50%;
            animation: vd-admin-spin 0.75s linear infinite;
          }

          @keyframes vd-admin-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className="vd-admin-layout">
      {mobileMenuOpen && (
        <button
          type="button"
          className="vd-admin-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        id="vd-admin-sidebar"
        className={`vd-admin-sidebar ${
          mobileMenuOpen ? 'vd-admin-sidebar-open' : ''
        }`}
        aria-label="Administrator navigation"
      >
        <div className="vd-admin-brand">
          <div className="vd-admin-brand-mark">V</div>

          <div className="vd-admin-brand-copy">
            <div className="vd-admin-brand-name">Valuedam</div>
            <div className="vd-admin-brand-subtitle">
              NETWORK ADMIN
            </div>
          </div>

          <button
            type="button"
            className="vd-admin-mobile-close"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="vd-admin-nav-scroll">
          {NAV_SECTIONS.map((section) => (
            <section
              className="vd-admin-nav-section"
              key={section.title}
            >
              <div className="vd-admin-nav-heading">
                {section.title}
              </div>

              <nav className="vd-admin-nav">
                {section.links.map((item) => (
                  <NavLink
                    key={item.to}
                    end={item.end}
                    to={item.to}
                    className={({ isActive }) =>
                      `vd-admin-nav-link ${
                        isActive ? 'vd-admin-nav-link-active' : ''
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="vd-admin-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>

                    <span className="vd-admin-nav-label">
                      {item.label}
                    </span>

                    {item.label === 'Affiliate Payouts' && (
                      <span className="vd-admin-nav-tag">NEW</span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </section>
          ))}
        </div>

        <div className="vd-admin-sidebar-footer">
          <div className="vd-admin-user">
            <div className="vd-admin-user-avatar">
              {(profile?.full_name || 'A').trim().charAt(0).toUpperCase()}
            </div>

            <div className="vd-admin-user-info">
              <div className="vd-admin-user-name">
                {profile?.full_name || 'Administrator'}
              </div>
              <div className="vd-admin-user-role">
                {profile?.role || 'admin'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="vd-admin-logout"
            onClick={logout}
          >
            <span aria-hidden="true">↪</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="vd-admin-main-column">
        <header className="vd-admin-mobile-header">
          <button
            type="button"
            className="vd-admin-menu-toggle"
            aria-label="Open navigation menu"
            aria-controls="vd-admin-sidebar"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="vd-admin-mobile-brand">
            <span className="vd-admin-mobile-brand-mark">V</span>
            <span>Valuedam Admin</span>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="vd-admin-mobile-site-link"
            aria-label="View website"
          >
            ↗
          </a>
        </header>

        <main className="vd-admin-main">
          <div className="vd-admin-topbar">
            <div className="vd-admin-page-identity">
              <span className="vd-admin-eyebrow">
                ADMINISTRATION
              </span>

              <h1>{profile?.full_name || 'Administrator'}</h1>
              <p>Manage your website and Valuedam Store.</p>
            </div>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="vd-admin-view-site"
            >
              View website <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="vd-admin-page-content">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .vd-admin-layout,
        .vd-admin-layout * {
          box-sizing: border-box;
        }

        .vd-admin-layout {
          --vd-admin-yellow: #f5b82e;
          --vd-admin-dark: #111827;
          --vd-admin-sidebar-width: 276px;

          display: flex;
          width: 100%;
          min-height: 100vh;
          background: #f5f7fb;
          color: #172033;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .vd-admin-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          width: var(--vd-admin-sidebar-width);
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: #111827;
          color: #e5e7eb;
          border-right: 1px solid rgba(255, 255, 255, 0.07);
        }

        .vd-admin-brand {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 12px;
          min-height: 82px;
          padding: 17px 19px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .vd-admin-brand-mark,
        .vd-admin-mobile-brand-mark {
          display: grid;
          flex: 0 0 auto;
          width: 43px;
          height: 43px;
          place-items: center;
          border-radius: 13px;
          background: var(--vd-admin-yellow);
          color: #111827;
          font-size: 24px;
          font-weight: 900;
        }

        .vd-admin-brand-copy {
          min-width: 0;
        }

        .vd-admin-brand-name {
          color: #fff;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .vd-admin-brand-subtitle {
          margin-top: 3px;
          color: #9ca3af;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .vd-admin-nav-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 13px 12px 18px;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #4b5563 #111827;
          -webkit-overflow-scrolling: touch;
        }

        .vd-admin-nav-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .vd-admin-nav-scroll::-webkit-scrollbar-track {
          background: #111827;
        }

        .vd-admin-nav-scroll::-webkit-scrollbar-thumb {
          border: 2px solid #111827;
          border-radius: 10px;
          background: #4b5563;
        }

        .vd-admin-nav-section {
          margin: 0 0 17px;
        }

        .vd-admin-nav-heading {
          padding: 10px 10px 8px;
          color: #9ca3af;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.15px;
          line-height: 1.4;
        }

        .vd-admin-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .vd-admin-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 42px;
          padding: 10px 11px;
          border: 1px solid transparent;
          border-radius: 9px;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 13px;
          font-weight: 550;
          line-height: 1.4;
          transition:
            background 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease;
        }

        .vd-admin-nav-link:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
        }

        .vd-admin-nav-link-active {
          border-color: rgba(245, 184, 46, 0.2);
          background: rgba(245, 184, 46, 0.13);
          color: #ffd56b;
          font-weight: 750;
        }

        .vd-admin-nav-link-active::before {
          position: absolute;
          top: 9px;
          bottom: 9px;
          left: -12px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: var(--vd-admin-yellow);
          content: "";
        }

        .vd-admin-nav-icon {
          display: grid;
          flex: 0 0 21px;
          width: 21px;
          place-items: center;
          color: #9ca3af;
          font-size: 17px;
          line-height: 1;
        }

        .vd-admin-nav-link-active .vd-admin-nav-icon {
          color: var(--vd-admin-yellow);
        }

        .vd-admin-nav-label {
          flex: 1 1 auto;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .vd-admin-nav-tag {
          flex: 0 0 auto;
          padding: 3px 5px;
          border-radius: 4px;
          background: var(--vd-admin-yellow);
          color: #111827;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .vd-admin-sidebar-footer {
          flex: 0 0 auto;
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: #111827;
        }

        .vd-admin-user {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 3px 4px 12px;
        }

        .vd-admin-user-avatar {
          display: grid;
          flex: 0 0 36px;
          width: 36px;
          height: 36px;
          place-items: center;
          border-radius: 50%;
          background: #374151;
          color: #fcd875;
          font-size: 15px;
          font-weight: 800;
        }

        .vd-admin-user-info {
          flex: 1 1 auto;
          min-width: 0;
        }

        .vd-admin-user-name {
          overflow: hidden;
          color: #f9fafb;
          font-size: 12px;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vd-admin-user-role {
          margin-top: 3px;
          color: #9ca3af;
          font-size: 11px;
          text-transform: capitalize;
        }

        .vd-admin-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          min-height: 39px;
          padding: 9px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          color: #e5e7eb;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
        }

        .vd-admin-logout:hover {
          border-color: rgba(248, 113, 113, 0.45);
          background: rgba(248, 113, 113, 0.1);
          color: #fecaca;
        }

        .vd-admin-main-column {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 100vh;
          margin-left: var(--vd-admin-sidebar-width);
        }

        .vd-admin-main {
          width: 100%;
          max-width: 1800px;
          min-width: 0;
          margin: 0 auto;
          padding: 28px 30px 40px;
        }

        .vd-admin-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 27px;
          padding: 0 0 23px;
          border-bottom: 1px solid #e5e9f0;
        }

        .vd-admin-page-identity {
          min-width: 0;
        }

        .vd-admin-eyebrow {
          color: #7b8495;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.7px;
        }

        .vd-admin-page-identity h1 {
          margin: 6px 0 0;
          color: #111827;
          font-size: clamp(21px, 2.1vw, 29px);
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .vd-admin-page-identity p {
          margin: 7px 0 0;
          color: #7b8495;
          font-size: 13px;
          line-height: 1.5;
        }

        .vd-admin-view-site {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 40px;
          padding: 10px 14px;
          border: 1px solid #dce2ea;
          border-radius: 9px;
          background: #fff;
          color: #263246;
          text-decoration: none;
          font-size: 12px;
          font-weight: 750;
          transition: background 0.15s ease;
        }

        .vd-admin-view-site:hover {
          background: #f9fafb;
        }

        .vd-admin-page-content {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .vd-admin-mobile-header,
        .vd-admin-mobile-close,
        .vd-admin-backdrop {
          display: none;
        }

        @media (min-width: 769px) {
          .vd-admin-sidebar {
            transform: translateX(0);
          }

          .vd-admin-main-column {
            width: calc(100% - var(--vd-admin-sidebar-width));
          }
        }

        @media (max-width: 1100px) and (min-width: 769px) {
          .vd-admin-layout {
            --vd-admin-sidebar-width: 245px;
          }

          .vd-admin-main {
            padding: 24px 20px 32px;
          }
        }

        @media (max-width: 768px) {
          .vd-admin-layout {
            display: block;
            min-height: 100vh;
          }

          .vd-admin-sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            z-index: 1200;
            width: min(310px, 86vw);
            height: 100vh;
            height: 100dvh;
            box-shadow: 16px 0 45px rgba(0, 0, 0, 0.22);
            transform: translateX(-105%);
            visibility: hidden;
            transition:
              transform 0.24s ease,
              visibility 0.24s ease;
          }

          .vd-admin-sidebar-open {
            transform: translateX(0);
            visibility: visible;
          }

          .vd-admin-mobile-close {
            display: grid;
            flex: 0 0 auto;
            width: 34px;
            height: 34px;
            place-items: center;
            margin-left: auto;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.06);
            color: #fff;
            cursor: pointer;
            font-size: 25px;
            line-height: 1;
          }

          .vd-admin-backdrop {
            position: fixed;
            inset: 0;
            z-index: 1100;
            display: block;
            width: 100%;
            height: 100%;
            border: 0;
            background: rgba(10, 15, 25, 0.58);
            cursor: pointer;
          }

          .vd-admin-main-column {
            width: 100%;
            min-height: 100vh;
            margin-left: 0;
          }

          .vd-admin-mobile-header {
            position: sticky;
            top: 0;
            z-index: 900;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 62px;
            padding: 10px 16px;
            border-bottom: 1px solid #e7ebf2;
            background: rgba(255, 255, 255, 0.97);
            box-shadow: 0 3px 14px rgba(17, 24, 39, 0.04);
            backdrop-filter: blur(12px);
          }

          .vd-admin-menu-toggle {
            display: flex;
            flex: 0 0 40px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            width: 40px;
            height: 40px;
            border: 1px solid #e1e5ec;
            border-radius: 9px;
            background: #fff;
            cursor: pointer;
          }

          .vd-admin-menu-toggle span {
            display: block;
            width: 18px;
            height: 2px;
            border-radius: 2px;
            background: #182230;
          }

          .vd-admin-mobile-brand {
            display: flex;
            flex: 1 1 auto;
            align-items: center;
            gap: 9px;
            min-width: 0;
            color: #172033;
            font-size: 14px;
            font-weight: 850;
          }

          .vd-admin-mobile-brand-mark {
            width: 31px;
            height: 31px;
            border-radius: 9px;
            font-size: 18px;
          }

          .vd-admin-mobile-site-link {
            display: grid;
            flex: 0 0 36px;
            width: 36px;
            height: 36px;
            place-items: center;
            border: 1px solid #e1e5ec;
            border-radius: 9px;
            background: #fff;
            color: #182230;
            text-decoration: none;
            font-size: 19px;
          }

          .vd-admin-main {
            padding: 22px 16px 32px;
          }

          .vd-admin-topbar {
            align-items: flex-start;
            margin-bottom: 22px;
            padding-bottom: 18px;
          }

          .vd-admin-page-identity h1 {
            font-size: 23px;
          }

          .vd-admin-page-identity p {
            font-size: 12px;
          }

          .vd-admin-view-site {
            display: none;
          }
        }

        @media (max-width: 380px) {
          .vd-admin-main {
            padding-right: 12px;
            padding-left: 12px;
          }

          .vd-admin-mobile-header {
            padding-right: 10px;
            padding-left: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vd-admin-sidebar,
          .vd-admin-nav-link {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
