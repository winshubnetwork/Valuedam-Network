import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const fallbackServices = [
  {
    id: "content-creation",
    slug: "content-creation",
    title: "Content Creation",
    description:
      "Professional written and visual content for websites, social media, businesses and marketing campaigns.",
    content:
      "We help businesses communicate clearly with customers through useful, engaging and business-focused content.",
  },
  {
    id: "social-media-management",
    slug: "social-media-management",
    title: "Social Media Management",
    description:
      "Keep your social media active, organized and professional while you focus on your business.",
    content:
      "We can help with content planning, posting, page management and day-to-day social media support.",
  },
  {
    id: "website-design-development",
    slug: "website-design-development",
    title: "Website Design & Development",
    description:
      "Professional websites for businesses, organizations, entrepreneurs and personal brands.",
    content:
      "From simple business websites to more advanced platforms, we help turn your ideas into functional websites.",
  },
  {
    id: "website-management",
    slug: "website-management",
    title: "Website Management",
    description:
      "Ongoing website updates, maintenance, content changes and technical support.",
    content:
      "Already have a website? We can help keep it updated, organized and useful for your customers.",
  },
  {
    id: "sourcing-procurement",
    slug: "sourcing-procurement",
    title: "Sourcing & Procurement",
    description:
      "Need a product, item or business resource sourced? Tell us what you need.",
    content:
      "We help individuals and businesses with sourcing and procurement requests where practical.",
  },
  {
    id: "sales-support",
    slug: "sales-support",
    title: "Sales Support",
    description:
      "Get help presenting, promoting and selling your products or services.",
    content:
      "We help businesses improve their online product presentation and connect their offers with potential customers.",
  },
  {
    id: "digital-marketing",
    slug: "digital-marketing",
    title: "Digital Marketing",
    description:
      "Practical digital marketing support to help businesses improve their online presence.",
    content:
      "We help businesses use digital channels to communicate their offers and reach potential customers.",
  },
  {
    id: "ecommerce-management",
    slug: "ecommerce-management",
    title: "E-commerce Management",
    description:
      "Support for online stores, product listings, inventory updates and digital sales operations.",
    content:
      "We can assist with product entry, online store organization, content updates and other e-commerce tasks.",
  },
  {
    id: "business-digital-setup",
    slug: "business-digital-setup",
    title: "Business Digital Setup",
    description:
      "Set up the digital tools and online presence your business needs.",
    content:
      "We help businesses organize their online presence and get started with useful digital tools.",
  },
  {
    id: "virtual-business-assistance",
    slug: "virtual-business-assistance",
    title: "Virtual Business Assistance",
    description:
      "Practical assistance with selected online and business tasks.",
    content:
      "Tell us what needs to be done and we will discuss how we can assist.",
  },
  {
    id: "business-listings",
    slug: "business-listings",
    title: "Business Listings & Online Presence",
    description:
      "Help your business become easier for customers to find online.",
    content:
      "We help businesses organize their basic digital presence and online business information.",
  },
  {
    id: "custom-request",
    slug: "custom-request",
    title: "Custom Business Request",
    description:
      "Have a task that does not fit into one of our listed services?",
    content:
      "Tell us exactly what you need. We will review the request and let you know how we can help.",
  },
];

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (!mounted) return;

        if (error || !data || data.length === 0) {
          setServices(fallbackServices);
        } else {
          setServices(data);
        }
      } catch (error) {
        console.error("Services loading error:", error);

        if (mounted) {
          setServices(fallbackServices);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="services-page">
      <style>{`
        .services-page {
          background: #fff;
          color: #111827;
        }

        .services-container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .services-hero {
          padding: 85px 0 75px;
          background:
            radial-gradient(circle at 85% 15%, rgba(22,163,74,.12), transparent 30%),
            #f8fafc;
        }

        .services-kicker {
          margin-bottom: 14px;
          color: #16a34a;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 1.6px;
          text-transform: uppercase;
        }

        .services-hero h1 {
          max-width: 760px;
          margin: 0;
          font-size: clamp(42px, 6vw, 68px);
          line-height: 1;
          letter-spacing: -2.5px;
        }

        .services-hero p {
          max-width: 680px;
          margin: 23px 0 0;
          color: #6b7280;
          font-size: 18px;
          line-height: 1.8;
        }

        .services-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .services-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 0 21px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        .services-btn-primary {
          background: #111827;
          color: white;
        }

        .services-btn-secondary {
          border: 1px solid #d1d5db;
          background: white;
          color: #111827;
        }

        .services-section {
          padding: 80px 0 95px;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 19px;
        }

        .service-card {
          display: flex;
          flex-direction: column;
          min-height: 275px;
          padding: 27px;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background: white;
          text-decoration: none;
          transition: .2s ease;
        }

        .service-card:hover {
          transform: translateY(-4px);
          border-color: #bbf7d0;
          box-shadow: 0 20px 45px rgba(15,23,42,.08);
        }

        .service-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin-bottom: 24px;
          border-radius: 13px;
          background: #dcfce7;
          color: #15803d;
          font-size: 19px;
          font-weight: 900;
        }

        .service-card h2 {
          margin: 0;
          color: #111827;
          font-size: 20px;
        }

        .service-card p {
          margin: 12px 0 23px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.75;
        }

        .service-link {
          margin-top: auto;
          color: #15803d;
          font-size: 13px;
          font-weight: 800;
        }

        .services-bottom {
          margin-top: 55px;
          padding: 45px;
          border-radius: 20px;
          background: #111827;
          color: white;
        }

        .services-bottom h2 {
          margin: 0;
          font-size: 31px;
        }

        .services-bottom p {
          max-width: 650px;
          margin: 12px 0 25px;
          color: #d1d5db;
          line-height: 1.7;
        }

        .services-bottom a {
          display: inline-flex;
          align-items: center;
          min-height: 48px;
          padding: 0 19px;
          border-radius: 8px;
          background: #16a34a;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .services-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 620px) {
          .services-container {
            width: min(100% - 28px, 1180px);
          }

          .services-hero {
            padding: 65px 0;
          }

          .services-grid {
            grid-template-columns: 1fr;
          }

          .services-bottom {
            padding: 30px 23px;
          }
        }
      `}</style>

      <section className="services-hero">
        <div className="services-container">
          <div className="services-kicker">Our Services</div>

          <h1>
            Tell us what you need. We'll help you get it done.
          </h1>

          <p>
            From websites and digital marketing to sourcing, sales support and
            business assistance, ValueDam Network provides practical services
            for real-world needs.
          </p>

          <div className="services-actions">
            <Link
              to="/request-service"
              className="services-btn services-btn-primary"
            >
              Request a Service →
            </Link>

            <Link
              to="/contact"
              className="services-btn services-btn-secondary"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="services-container">
          {loading ? (
            <p>Loading services...</p>
          ) : (
            <>
              <div className="services-grid">
                {services.map((service, index) => (
                  <Link
                    key={service.id || service.slug || `service-${index}`}
                    to={`/services/${service.slug || service.id}`}
                    className="service-card"
                  >
                    <div className="service-icon">
                      {String(service.title || "S").charAt(0)}
                    </div>

                    <h2>{service.title}</h2>

                    <p>
                      {service.short_description ||
                        service.description ||
                        "Practical support for your business needs."}
                    </p>

                    <div className="service-link">
                      View service →
                    </div>
                  </Link>
                ))}
              </div>

              <div className="services-bottom">
                <h2>Don't see exactly what you need?</h2>

                <p>
                  That's okay. Not every business problem fits into a fixed
                  service. Tell us what you need and we'll review your request.
                </p>

                <Link to="/request-service">
                  Tell Us What You Need →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}