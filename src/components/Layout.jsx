import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="site">

      <header className="header">
        <div className="container nav">

          <Link to="/" className="brand">
            <span className="brand-mark">V</span>
            <span>
              ValueDam <b>Network</b>
            </span>
          </Link>

          <nav>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>

          <Link className="nav-cta" to="/request-service">
            Request Service
          </Link>

        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">

        <div className="container footer-grid">

          <div>
            <div className="brand footer-brand">
              <span className="brand-mark">V</span>
              <span>
                ValueDam <b>Network</b>
              </span>
            </div>

            <p>
              Helping businesses and individuals get important tasks done.
            </p>
          </div>

          <div>
            <h4>Explore</h4>
            <Link to="/services">Services</Link>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/blog">Blog</Link>
          </div>

          <div>
            <h4>Connect</h4>
            <Link to="/contact">Contact us</Link>
            <Link to="/request-service">Request a service</Link>

            <a
              href="https://valuedam.com.ng"
              target="_blank"
              rel="noreferrer"
            >
              ValueDam Marketplace
            </a>
          </div>

        </div>

        <div className="container footer-bottom">
          © {new Date().getFullYear()} ValueDam Network. All rights reserved.
        </div>

      </footer>

    </div>
  );
}