import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ServiceDetail() {
  const { slug } = useParams();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadService() {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("slug", slug)
          .eq("active", true)
          .maybeSingle();

        if (!mounted) return;

        if (error || !data) {
          setService(null);
        } else {
          setService(data);
        }
      } catch (error) {
        console.error("Service detail error:", error);

        if (mounted) {
          setService(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadService();

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center" }}>
        Loading service...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="service-not-found">
        <style>{`
          .service-not-found {
            min-height: 65vh;
            display: grid;
            place-items: center;
            padding: 60px 20px;
            text-align: center;
            background: #f8fafc;
          }

          .service-not-found-box {
            max-width: 600px;
          }

          .service-not-found h1 {
            margin: 0;
            color: #111827;
            font-size: 40px;
          }

          .service-not-found p {
            margin: 15px 0 25px;
            color: #6b7280;
            line-height: 1.7;
          }

          .service-not-found a {
            display: inline-flex;
            min-height: 48px;
            align-items: center;
            padding: 0 20px;
            border-radius: 8px;
            background: #111827;
            color: white;
            text-decoration: none;
            font-weight: 800;
          }
        `}</style>

        <div className="service-not-found-box">
          <h1>Service not found</h1>

          <p>
            This service may have been removed, unpublished or the link may no
            longer be available.
          </p>

          <Link to="/services">← Back to Services</Link>
        </div>
      </div>
    );
  }

  const description =
    service.short_description ||
    service.description ||
    "Tell us what you need and we'll discuss how we can help.";

  const content =
    service.content ||
    service.description ||
    "We provide practical support based on your specific needs.";

  return (
    <div className="service-detail-page">
      <style>{`
        .service-detail-page {
          color: #111827;
          background: #fff;
        }

        .service-detail-hero {
          padding: 85px 0 80px;
          background:
            radial-gradient(circle at 85% 20%, rgba(22,163,74,.12), transparent 30%),
            #f8fafc;
        }

        .service-detail-container {
          width: min(1000px, calc(100% - 40px));
          margin: 0 auto;
        }

        .service-back {
          display: inline-flex;
          margin-bottom: 35px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
        }

        .service-detail-icon {
          display: grid;
          place-items: center;
          width: 60px;
          height: 60px;
          margin-bottom: 25px;
          border-radius: 16px;
          background: #dcfce7;
          color: #15803d;
          font-size: 24px;
          font-weight: 900;
        }

        .service-detail-hero h1 {
          max-width: 800px;
          margin: 0;
          font-size: clamp(40px, 6vw, 65px);
          line-height: 1;
          letter-spacing: -2px;
        }

        .service-detail-lead {
          max-width: 730px;
          margin: 22px 0 0;
          color: #6b7280;
          font-size: 18px;
          line-height: 1.8;
        }

        .service-detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 32px;
        }

        .service-detail-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 51px;
          padding: 0 22px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        .service-detail-btn-primary {
          background: #111827;
          color: white;
        }

        .service-detail-btn-secondary {
          border: 1px solid #d1d5db;
          background: white;
          color: #111827;
        }

        .service-detail-content {
          padding: 80px 0;
        }

        .service-detail-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 65px;
        }

        .service-detail-main h2 {
          margin: 0 0 20px;
          font-size: 32px;
        }

        .service-detail-main p {
          margin: 0 0 20px;
          color: #4b5563;
          font-size: 16px;
          line-height: 1.9;
          white-space: pre-line;
        }

        .service-detail-side {
          height: fit-content;
          padding: 25px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #f8fafc;
        }

        .service-detail-side h3 {
          margin: 0 0 17px;
          font-size: 18px;
        }

        .service-side-item {
          display: flex;
          gap: 9px;
          margin-bottom: 13px;
          color: #4b5563;
          font-size: 13px;
          line-height: 1.5;
        }

        .service-side-check {
          color: #16a34a;
          font-weight: 900;
        }

        .service-detail-bottom {
          padding: 65px 0 90px;
        }

        .service-detail-cta {
          padding: 48px;
          border-radius: 20px;
          background: #111827;
          color: white;
        }

        .service-detail-cta h2 {
          margin: 0;
          font-size: 32px;
        }

        .service-detail-cta p {
          max-width: 650px;
          margin: 13px 0 25px;
          color: #d1d5db;
          line-height: 1.7;
        }

        .service-detail-cta a {
          display: inline-flex;
          min-height: 49px;
          align-items: center;
          padding: 0 20px;
          border-radius: 8px;
          background: #16a34a;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 800px) {
          .service-detail-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .service-detail-container {
            width: min(100% - 28px, 1000px);
          }

          .service-detail-hero {
            padding: 65px 0;
          }

          .service-detail-content {
            padding: 60px 0;
          }

          .service-detail-cta {
            padding: 30px 23px;
          }
        }
      `}</style>

      <section className="service-detail-hero">
        <div className="service-detail-container">
          <Link to="/services" className="service-back">
            ← Back to Services
          </Link>

          <div className="service-detail-icon">
            {String(service.title || "S").charAt(0)}
          </div>

          <h1>{service.title}</h1>

          <p className="service-detail-lead">{description}</p>

          <div className="service-detail-actions">
            <Link
              to={`/request-service?service=${encodeURIComponent(
                service.title
              )}`}
              className="service-detail-btn service-detail-btn-primary"
            >
              Request This Service →
            </Link>

            <Link
              to="/contact"
              className="service-detail-btn service-detail-btn-secondary"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section className="service-detail-content">
        <div className="service-detail-container service-detail-layout">
          <article className="service-detail-main">
            <h2>About This Service</h2>

            <p>{content}</p>

            <p>
              Every request is different. After you tell us what you need, we
              can discuss the scope, requirements, timeline and next steps
              before work begins.
            </p>
          </article>

          <aside className="service-detail-side">
            <h3>What you can expect</h3>

            <div className="service-side-item">
              <span className="service-side-check">✓</span>
              <span>Clear discussion of your requirements</span>
            </div>

            <div className="service-side-item">
              <span className="service-side-check">✓</span>
              <span>Practical approach to your request</span>
            </div>

            <div className="service-side-item">
              <span className="service-side-check">✓</span>
              <span>Scope and next steps discussed upfront</span>
            </div>

            <div className="service-side-item">
              <span className="service-side-check">✓</span>
              <span>Updates during the work where applicable</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="service-detail-bottom">
        <div className="service-detail-container">
          <div className="service-detail-cta">
            <h2>Ready to get started?</h2>

            <p>
              Tell us what you need and we'll review your request and discuss
              the next step with you.
            </p>

            <Link
              to={`/request-service?service=${encodeURIComponent(
                service.title
              )}`}
            >
              Request This Service →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}