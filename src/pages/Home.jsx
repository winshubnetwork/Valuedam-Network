import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const fallbackServices = [
  {
    id: "content",
    slug: "content-creation",
    title: "Content Creation",
    description:
      "Clear, engaging content for your website, social media, business and marketing needs.",
  },
  {
    id: "social",
    slug: "social-media-management",
    title: "Social Media Management",
    description:
      "We help businesses stay active, organized and professional across their social platforms.",
  },
  {
    id: "web",
    slug: "website-design-development",
    title: "Website Design & Development",
    description:
      "Professional websites designed to give your business a strong online presence.",
  },
  {
    id: "management",
    slug: "website-management",
    title: "Website Management",
    description:
      "Updates, content changes, maintenance and ongoing support for your website.",
  },
  {
    id: "sales",
    slug: "sell-for-me",
    title: "Sales Support",
    description:
      "We help businesses present, promote and sell their products or services online.",
  },
  {
    id: "sourcing",
    slug: "sourcing-procurement",
    title: "Sourcing & Procurement",
    description:
      "Need something sourced or purchased? Tell us what you need and we will help.",
  },
];

const fallbackPortfolio = [
  {
    id: "p1",
    title: "Business Website",
    description:
      "A professional online presence designed to help a business attract customers.",
    category: "Web Design",
  },
  {
    id: "p2",
    title: "Digital Business Setup",
    description:
      "Helping businesses establish and organize their digital presence.",
    category: "Digital Setup",
  },
  {
    id: "p3",
    title: "Online Content & Marketing",
    description:
      "Content and digital support designed to help businesses communicate better.",
    category: "Digital Marketing",
  },
];

const fallbackTestimonials = [
  {
    id: "t1",
    name: "Business Owner",
    company: "Small Business",
    content:
      "ValueDam Network makes it easier to get important business tasks handled without unnecessary stress.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Entrepreneur",
    company: "Growing Business",
    content:
      "The focus is practical. You explain what you need and get support around the actual task.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Business Professional",
    company: "Local Business",
    content:
      "A useful service for businesses that need digital and operational support.",
    rating: 5,
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">→</span>;
}

function CheckIcon() {
  return <span className="home-check">✓</span>;
}

export default function Home() {
  const [home, setHome] = useState(null);
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadHomepage() {
      try {
        const [
          homepageResult,
          servicesResult,
          portfolioResult,
          testimonialsResult,
          settingsResult,
        ] = await Promise.all([
          supabase
            .from("homepage_content")
            .select("*")
            .limit(1)
            .maybeSingle(),

          supabase
            .from("services")
            .select("*")
            .eq("active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("portfolio_projects")
            .select("*")
            .eq("active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("testimonials")
            .select("*")
            .eq("active", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("site_settings")
            .select("*")
            .limit(1)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        if (homepageResult.data) {
          setHome(homepageResult.data);
        }

        if (
          !servicesResult.error &&
          servicesResult.data &&
          servicesResult.data.length
        ) {
          setServices(servicesResult.data);
        } else {
          setServices(fallbackServices);
        }

        if (
          !portfolioResult.error &&
          portfolioResult.data &&
          portfolioResult.data.length
        ) {
          setPortfolio(portfolioResult.data.slice(0, 3));
        } else {
          setPortfolio(fallbackPortfolio);
        }

        if (
          !testimonialsResult.error &&
          testimonialsResult.data &&
          testimonialsResult.data.length
        ) {
          setTestimonials(testimonialsResult.data.slice(0, 3));
        } else {
          setTestimonials(fallbackTestimonials);
        }

        if (!settingsResult.error && settingsResult.data) {
          setSettings(settingsResult.data);
        }
      } catch (error) {
        console.error("Homepage loading error:", error);

        if (!mounted) return;

        setServices(fallbackServices);
        setPortfolio(fallbackPortfolio);
        setTestimonials(fallbackTestimonials);
      }
    }

    loadHomepage();

    return () => {
      mounted = false;
    };
  }, []);

  const heroTitle =
    home?.hero_title || "Your Business. Our Support.";

  const heroText =
    home?.hero_text ||
    "You have a business task. We help you get it done.";

  const heroButton =
    home?.hero_button || "Request a Service";

  const aboutTitle =
    home?.about_title || "Helping Businesses Get Things Done";

  const aboutText =
    home?.about_text ||
    "ValueDam Network provides practical digital, business and support services for individuals and businesses.";

  const ctaTitle =
    home?.cta_title || "Ready to Get Started?";

  const ctaText =
    home?.cta_text ||
    "Tell us what you need and let us help you get it done.";

  const whatsappNumber = settings?.whatsapp || "";

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}`
    : "/contact";

  return (
    <div className="home-page">
      <style>{`
        .home-page {
          background: #ffffff;
          color: #111827;
        }

        .home-page * {
          box-sizing: border-box;
        }

        .home-container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .home-hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 85% 20%, rgba(22, 163, 74, 0.14), transparent 28%),
            radial-gradient(circle at 10% 90%, rgba(22, 163, 74, 0.08), transparent 30%),
            #f8fafc;
          padding: 95px 0 90px;
        }

        .home-hero-grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 70px;
          align-items: center;
        }

        .home-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 22px;
          padding: 8px 13px;
          border: 1px solid rgba(22, 163, 74, 0.18);
          border-radius: 999px;
          background: rgba(255,255,255,0.8);
          color: #15803d;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .home-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
        }

        .home-hero h1 {
          max-width: 760px;
          margin: 0;
          color: #111827;
          font-size: clamp(44px, 6vw, 76px);
          line-height: 0.98;
          letter-spacing: -3px;
          font-weight: 850;
        }

        .home-hero h1 span {
          color: #16a34a;
        }

        .home-hero-description {
          max-width: 650px;
          margin: 28px 0 0;
          color: #4b5563;
          font-size: 19px;
          line-height: 1.75;
        }

        .home-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 34px;
        }

        .home-primary-btn,
        .home-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 52px;
          padding: 0 22px;
          border-radius: 9px;
          text-decoration: none;
          font-size: 15px;
          font-weight: 750;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .home-primary-btn {
          background: #111827;
          color: white;
          box-shadow: 0 12px 30px rgba(17,24,39,0.16);
        }

        .home-secondary-btn {
          border: 1px solid #d1d5db;
          background: white;
          color: #111827;
        }

        .home-primary-btn:hover,
        .home-secondary-btn:hover {
          transform: translateY(-2px);
        }

        .home-trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-top: 34px;
          color: #6b7280;
          font-size: 13px;
        }

        .home-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .home-check {
          color: #16a34a;
          font-weight: 900;
        }

        .home-hero-card {
          position: relative;
        }

        .home-card-main {
          position: relative;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          background: rgba(255,255,255,0.9);
          box-shadow: 0 30px 70px rgba(15,23,42,0.12);
        }

        .home-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .home-card-label {
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .home-card-badge {
          padding: 6px 10px;
          border-radius: 999px;
          background: #dcfce7;
          color: #15803d;
          font-size: 11px;
          font-weight: 800;
        }

        .home-card-title {
          margin: 0;
          color: #111827;
          font-size: 30px;
          line-height: 1.15;
        }

        .home-card-text {
          margin: 13px 0 25px;
          color: #6b7280;
          line-height: 1.7;
        }

        .home-task-list {
          display: grid;
          gap: 11px;
        }

        .home-task {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border: 1px solid #eef0f2;
          border-radius: 12px;
          background: #f9fafb;
          color: #374151;
          font-size: 13px;
          font-weight: 650;
        }

        .home-task-icon {
          display: grid;
          place-items: center;
          width: 29px;
          height: 29px;
          border-radius: 9px;
          background: #dcfce7;
          color: #15803d;
          font-weight: 900;
        }

        .home-floating {
          position: absolute;
          right: -18px;
          bottom: -25px;
          max-width: 220px;
          padding: 17px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: white;
          box-shadow: 0 20px 45px rgba(15,23,42,0.12);
        }

        .home-floating strong {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .home-floating span {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.5;
        }

        .home-section {
          padding: 90px 0;
        }

        .home-section-soft {
          background: #f8fafc;
        }

        .home-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 42px;
        }

        .home-section-kicker {
          margin-bottom: 10px;
          color: #16a34a;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .home-section-title {
          max-width: 700px;
          margin: 0;
          color: #111827;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.1;
          letter-spacing: -1.5px;
        }

        .home-section-description {
          max-width: 590px;
          margin: 15px 0 0;
          color: #6b7280;
          font-size: 16px;
          line-height: 1.75;
        }

        .home-view-all {
          flex-shrink: 0;
          color: #111827;
          font-size: 14px;
          font-weight: 750;
          text-decoration: none;
        }

        .home-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .home-service-card {
          display: flex;
          flex-direction: column;
          min-height: 245px;
          padding: 25px;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background: white;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .home-service-card:hover {
          transform: translateY(-4px);
          border-color: #bbf7d0;
          box-shadow: 0 20px 45px rgba(15,23,42,0.08);
        }

        .home-service-icon {
          display: grid;
          place-items: center;
          width: 45px;
          height: 45px;
          margin-bottom: 24px;
          border-radius: 12px;
          background: #dcfce7;
          color: #15803d;
          font-size: 18px;
          font-weight: 900;
        }

        .home-service-card h3 {
          margin: 0;
          color: #111827;
          font-size: 20px;
        }

        .home-service-card p {
          margin: 11px 0 22px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.7;
        }

        .home-service-link {
          margin-top: auto;
          color: #15803d;
          font-size: 13px;
          font-weight: 800;
        }

        .home-about-grid {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 70px;
          align-items: center;
        }

        .home-about-panel {
          min-height: 410px;
          padding: 34px;
          border-radius: 22px;
          background: #111827;
          color: white;
          overflow: hidden;
          position: relative;
        }

        .home-about-panel::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          right: -90px;
          bottom: -90px;
          border-radius: 50%;
          background: rgba(22,163,74,0.45);
        }

        .home-about-mark {
          display: grid;
          place-items: center;
          width: 65px;
          height: 65px;
          border-radius: 17px;
          background: #16a34a;
          color: white;
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 75px;
        }

        .home-about-panel h3 {
          position: relative;
          z-index: 1;
          max-width: 350px;
          margin: 0;
          font-size: 31px;
          line-height: 1.2;
        }

        .home-about-panel p {
          position: relative;
          z-index: 1;
          max-width: 390px;
          margin: 15px 0 0;
          color: #d1d5db;
          line-height: 1.7;
        }

        .home-about-copy h2 {
          margin: 0;
          color: #111827;
          font-size: clamp(31px, 4vw, 47px);
          line-height: 1.1;
          letter-spacing: -1.5px;
        }

        .home-about-copy > p {
          margin: 20px 0 0;
          color: #6b7280;
          line-height: 1.85;
        }

        .home-benefits {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 30px;
        }

        .home-benefit {
          display: flex;
          gap: 11px;
          color: #374151;
          font-size: 14px;
          line-height: 1.5;
        }

        .home-benefit .home-check {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .home-portfolio-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .home-project {
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background: white;
        }

        .home-project-image {
          display: grid;
          place-items: center;
          height: 190px;
          background: linear-gradient(135deg, #111827, #1f2937);
          color: #4ade80;
          font-size: 42px;
          font-weight: 900;
        }

        .home-project-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .home-project-body {
          padding: 22px;
        }

        .home-project-category {
          margin-bottom: 8px;
          color: #16a34a;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.1px;
          text-transform: uppercase;
        }

        .home-project h3 {
          margin: 0;
          color: #111827;
          font-size: 19px;
        }

        .home-project p {
          margin: 10px 0 0;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.7;
        }

        .home-testimonials {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .home-testimonial {
          padding: 27px;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background: white;
        }

        .home-stars {
          color: #f59e0b;
          letter-spacing: 2px;
          font-size: 14px;
        }

        .home-testimonial blockquote {
          margin: 20px 0 25px;
          color: #374151;
          font-size: 15px;
          line-height: 1.8;
        }

        .home-testimonial-name {
          color: #111827;
          font-size: 14px;
          font-weight: 800;
        }

        .home-testimonial-company {
          margin-top: 4px;
          color: #9ca3af;
          font-size: 12px;
        }

        .home-cta {
          padding: 80px 0;
        }

        .home-cta-box {
          position: relative;
          overflow: hidden;
          padding: 60px;
          border-radius: 24px;
          background: #111827;
          color: white;
        }

        .home-cta-box::after {
          content: "";
          position: absolute;
          width: 330px;
          height: 330px;
          right: -120px;
          top: -180px;
          border-radius: 50%;
          background: rgba(22,163,74,0.5);
        }

        .home-cta-content {
          position: relative;
          z-index: 1;
          max-width: 730px;
        }

        .home-cta-box h2 {
          margin: 0;
          font-size: clamp(31px, 4vw, 49px);
          line-height: 1.1;
          letter-spacing: -1.5px;
        }

        .home-cta-box p {
          max-width: 650px;
          margin: 17px 0 28px;
          color: #d1d5db;
          line-height: 1.75;
        }

        .home-cta-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .home-cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 0 21px;
          border-radius: 8px;
          background: #16a34a;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        .home-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 0 21px;
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 8px;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .home-hero-grid,
          .home-about-grid {
            grid-template-columns: 1fr;
          }

          .home-hero {
            padding: 70px 0;
          }

          .home-services-grid,
          .home-portfolio-grid,
          .home-testimonials {
            grid-template-columns: 1fr 1fr;
          }

          .home-floating {
            right: 10px;
          }
        }

        @media (max-width: 650px) {
          .home-container {
            width: min(100% - 28px, 1180px);
          }

          .home-hero h1 {
            font-size: 47px;
            letter-spacing: -2px;
          }

          .home-hero-description {
            font-size: 16px;
          }

          .home-section {
            padding: 65px 0;
          }

          .home-section-head {
            display: block;
          }

          .home-view-all {
            display: inline-block;
            margin-top: 18px;
          }

          .home-services-grid,
          .home-portfolio-grid,
          .home-testimonials,
          .home-benefits {
            grid-template-columns: 1fr;
          }

          .home-card-main {
            padding: 22px;
          }

          .home-floating {
            position: relative;
            right: auto;
            bottom: auto;
            margin: 15px 0 0 auto;
          }

          .home-about-panel {
            min-height: 340px;
          }

          .home-about-mark {
            margin-bottom: 55px;
          }

          .home-cta-box {
            padding: 38px 24px;
          }
        }
      `}</style>

      <section className="home-hero">
        <div className="home-container home-hero-grid">
          <div>
            <div className="home-eyebrow">
              <span className="home-eyebrow-dot"></span>
              ValueDam Network
            </div>

            <h1>
              {heroTitle.split("Our Support.")[0]}
              {heroTitle.includes("Our Support.") && (
                <span>Our Support.</span>
              )}
              {!heroTitle.includes("Our Support.") &&
                !heroTitle.includes("Your Business.") &&
                ""}
            </h1>

            <p className="home-hero-description">{heroText}</p>

            <div className="home-actions">
              <Link to="/request-service" className="home-primary-btn">
                {heroButton} <ArrowIcon />
              </Link>

              <Link to="/services" className="home-secondary-btn">
                Explore Services
              </Link>
            </div>

            <div className="home-trust-row">
              <div className="home-trust-item">
                <CheckIcon /> Practical support
              </div>
              <div className="home-trust-item">
                <CheckIcon /> Digital solutions
              </div>
              <div className="home-trust-item">
                <CheckIcon /> Business focused
              </div>
            </div>
          </div>

          <div className="home-hero-card">
            <div className="home-card-main">
              <div className="home-card-top">
                <span className="home-card-label">How we help</span>
                <span className="home-card-badge">Let's get it done</span>
              </div>

              <h2 className="home-card-title">
                One place for the tasks your business needs.
              </h2>

              <p className="home-card-text">
                From digital work to business support, tell us what you need
                and we will help you find a practical way forward.
              </p>

              <div className="home-task-list">
                <div className="home-task">
                  <span className="home-task-icon">W</span>
                  Websites & digital presence
                </div>

                <div className="home-task">
                  <span className="home-task-icon">C</span>
                  Content & social media
                </div>

                <div className="home-task">
                  <span className="home-task-icon">S</span>
                  Sourcing & sales support
                </div>

                <div className="home-task">
                  <span className="home-task-icon">B</span>
                  Business & online support
                </div>
              </div>
            </div>

            <div className="home-floating">
              <strong>Have a specific task?</strong>
              <span>
                You don't have to fit into a fixed package. Tell us what you
                need.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">What we do</div>
              <h2 className="home-section-title">
                Practical services for real business needs.
              </h2>
              <p className="home-section-description">
                Whether you need something built, managed, promoted, sourced
                or sold, ValueDam Network is here to help you get the task
                handled.
              </p>
            </div>

            <Link to="/services" className="home-view-all">
              View all services →
            </Link>
          </div>

          <div className="home-services-grid">
            {services.slice(0, 6).map((service, index) => (
              <Link
                key={service.id || service.slug || `service-${index}`}
                to={`/services/${service.slug || service.id || ""}`}
                className="home-service-card"
              >
                <div className="home-service-icon">
                  {String(service.title || "S").charAt(0)}
                </div>

                <h3>{service.title}</h3>

                <p>
                  {service.short_description ||
                    service.description ||
                    "Practical support designed around your business needs."}
                </p>

                <div className="home-service-link">
                  Learn more <ArrowIcon />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section-soft">
        <div className="home-container home-about-grid">
          <div className="home-about-panel">
            <div className="home-about-mark">V</div>

            <h3>
              Digital support should make business easier, not more
              complicated.
            </h3>

            <p>
              We combine digital services, business support and practical
              assistance to help you move from idea to execution.
            </p>
          </div>

          <div className="home-about-copy">
            <div className="home-section-kicker">Why ValueDam Network</div>

            <h2>{aboutTitle}</h2>

            <p>{aboutText}</p>

            <div className="home-benefits">
              <div className="home-benefit">
                <CheckIcon />
                <span>Services built around actual tasks</span>
              </div>

              <div className="home-benefit">
                <CheckIcon />
                <span>Clear communication and practical solutions</span>
              </div>

              <div className="home-benefit">
                <CheckIcon />
                <span>Support for individuals and businesses</span>
              </div>

              <div className="home-benefit">
                <CheckIcon />
                <span>Digital and operational assistance</span>
              </div>

              <div className="home-benefit">
                <CheckIcon />
                <span>Flexible support for different business needs</span>
              </div>

              <div className="home-benefit">
                <CheckIcon />
                <span>One network for multiple business tasks</span>
              </div>
            </div>

            <div className="home-actions">
              <Link to="/about" className="home-primary-btn">
                Learn About Us <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Our work</div>
              <h2 className="home-section-title">
                Work that helps businesses move forward.
              </h2>
            </div>

            <Link to="/portfolio" className="home-view-all">
              View portfolio →
            </Link>
          </div>

          <div className="home-portfolio-grid">
            {portfolio.map((project, index) => (
              <div
                className="home-project"
                key={project.id || `project-${index}`}
              >
                <div className="home-project-image">
                  {project.image_url ? (

<img
  src={project.image_url}
  alt={project.title || "ValueDam Network project"}
  loading="lazy"
  decoding="async"
/>
                  ) : (
                    <span>V</span>
                  )}
                </div>

                <div className="home-project-body">
                  <div className="home-project-category">
                    {project.category || "ValueDam Network"}
                  </div>

                  <h3>{project.title}</h3>

                  <p>
                    {project.description ||
                      "A practical digital project delivered with the client's needs in mind."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section-soft">
        <div className="home-container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Client feedback</div>
              <h2 className="home-section-title">
                Built around getting the job done.
              </h2>
            </div>
          </div>

          <div className="home-testimonials">
            {testimonials.map((testimonial, index) => (
              <div
                className="home-testimonial"
                key={testimonial.id || `testimonial-${index}`}
              >
                <div className="home-stars">
                  {"★".repeat(
                    Math.max(
                      1,
                      Math.min(Number(testimonial.rating) || 5, 5)
                    )
                  )}
                </div>

                <blockquote>
                  “
                  {testimonial.content ||
                    "ValueDam Network provides practical support for business needs."}
                  ”
                </blockquote>

                <div className="home-testimonial-name">
                  {testimonial.name || "ValueDam Client"}
                </div>

                <div className="home-testimonial-company">
                  {testimonial.company || "Client"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-container">
          <div className="home-cta-box">
            <div className="home-cta-content">
              <div className="home-section-kicker">Let's work together</div>

              <h2>{ctaTitle}</h2>

              <p>{ctaText}</p>

              <div className="home-cta-actions">
                <Link to="/request-service" className="home-cta-primary">
                  Request a Service <ArrowIcon />
                </Link>

                <a
                  href={whatsappUrl}
                  target={whatsappNumber ? "_blank" : undefined}
                  rel={whatsappNumber ? "noreferrer" : undefined}
                  className="home-cta-secondary"
                >
                  Chat With Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}