import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminShell() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }

      const { data: p, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (
        error ||
        !p?.active ||
        !['admin', 'editor'].includes(p.role)
      ) {
        await supabase.auth.signOut();
        navigate('/admin/login', { replace: true });
        return;
      }

      if (mounted) {
        setProfile(p);
        setChecking(false);
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  }

  if (checking) {
    return (
      <div className="admin-loading">
        Checking administrator access…
      </div>
    );
  }

  return (
    <div className="admin-layout">

      <aside className="admin-sidebar">

        <div className="admin-logo">
          <span className="brand-mark">V</span>

          <div>
            ValueDam
            <br />
            <b>Network Admin</b>
          </div>
        </div>

        <nav>

          <NavLink
            end
            to="/admin"
          >
            Dashboard
          </NavLink>

          <NavLink to="/admin/homepage">
            Homepage
          </NavLink>

          <NavLink to="/admin/customers">
            Customers
          </NavLink>

          <NavLink to="/admin/services">
            Services
          </NavLink>

          <NavLink to="/admin/portfolio">
            Portfolio
          </NavLink>

          <NavLink to="/admin/testimonials">
            Testimonials
          </NavLink>

          <NavLink to="/admin/requests">
            Service Requests
          </NavLink>

          <NavLink to="/admin/pipeline">
            Sales Pipeline
          </NavLink>

          <NavLink to="/admin/quotes">
            Quotes
          </NavLink>

          {/* INVOICES */}

          <NavLink to="/admin/invoices">
            Invoices
          </NavLink>
          <NavLink to="/admin/payments">
  Payments
</NavLink>

          {/* JOBS */}

          <NavLink to="/admin/jobs">
            Jobs
          </NavLink>

          <NavLink to="/admin/blog">
            Blog
          </NavLink>
          <NavLink to="/admin/blog/comments">
  Blog Comments
</NavLink>

          <NavLink to="/admin/messages">
            Contact Messages
          </NavLink>

          <NavLink to="/admin/blog/categories">
            Blog Categories
          </NavLink>

          <NavLink to="/admin/settings">
            Site Settings
          </NavLink>

        </nav>

        <button
          className="admin-logout"
          onClick={logout}
        >
          Sign out
        </button>

      </aside>

      <main className="admin-main">

        <div className="admin-top">

          <div>

            <span className="eyebrow">
              ADMINISTRATION
            </span>

            <h1>
              {profile?.full_name || 'Administrator'}
            </h1>

          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="btn secondary"
          >
            View website ↗
          </a>

        </div>

        <Outlet />

      </main>

    </div>
  );
}