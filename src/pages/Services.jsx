
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Search,
  X,
  Sparkles,
  PenTool,
  Share2,
  Globe,
  Settings,
  ShoppingCart,
  TrendingUp,
  Store,
  BriefcaseBusiness,
  MapPin,
  MessageCircle,
  CheckCircle2,
  ShieldCheck,
  Clock3,
  Headphones,
  Layers3,
  LoaderCircle,
} from "lucide-react";
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

const serviceIcons = [
  PenTool,
  Share2,
  Globe,
  Settings,
  ShoppingCart,
  TrendingUp,
  Sparkles,
  Store,
  Layers3,
  BriefcaseBusiness,
  MapPin,
  MessageCircle,
];

function getServiceIcon(service, index) {
  const value = `${service.slug || ""} ${service.title || ""}`.toLowerCase();

  if (value.includes("content") || value.includes("writing")) return PenTool;
  if (value.includes("social media")) return Share2;
  if (value.includes("website") || value.includes("web design")) return Globe;
  if (value.includes("sourcing") || value.includes("procurement")) {
    return ShoppingCart;
  }
  if (value.includes("sales") || value.includes("marketing")) {
    return TrendingUp;
  }
  if (value.includes("ecommerce") || value.includes("e-commerce")) {
    return Store;
  }
  if (value.includes("listing") || value.includes("online presence")) {
    return MapPin;
  }
  if (value.includes("virtual") || value.includes("assistance")) {
    return Headphones;
  }
  if (value.includes("custom") || value.includes("request")) {
    return MessageCircle;
  }
  if (value.includes("business")) return BriefcaseBusiness;

  return serviceIcons[index % serviceIcons.length];
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return services;

    return services.filter((service) => {
      const searchableText = [
        service.title,
        service.description,
        service.short_description,
        service.content,
        service.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [services, searchTerm]);

  return (
    <div className="vd-services-page">
      <style>{`
        .vd-services-page {
          --vd-green: #15803d;
          --vd-green-dark: #11632f;
          --vd-green-soft: #eaf7ee;
          --vd-ink: #14211b;
          --vd-muted: #647067;
          --vd-border: #e5ebe6;
          width: 100%;
          overflow: hidden;
          background: #ffffff;
          color: var(--vd-ink);
          font-family: inherit;
        }

        .vd-services-page * {
          box-sizing: border-box;
        }

        .vd-services-container {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        .vd-services-page a {
          -webkit-tap-highlight-color: transparent;
        }

        .vd-services-hero {
          position: relative;
          isolation: isolate;
          padding: 92px 0 84px;
          background:
            radial-gradient(
              circle at 88% 18%,
              rgba(34, 197, 94, 0.14),
              transparent 27%
            ),
            radial-gradient(
              circle at 5% 95%,
              rgba(22, 163, 74, 0.07),
              transparent 28%
            ),
            linear-gradient(135deg, #f8fcf9 0%, #f2f8f3 52%, #ffffff 100%);
        }

        .vd-services-hero::before {
          position: absolute;
          z-index: -1;
          top: 35px;
          right: -90px;
          width: 310px;
          height: 310px;
          border: 1px solid rgba(21, 128, 61, 0.1);
          border-radius: 50%;
          content: "";
        }

        .vd-services-hero::after {
          position: absolute;
          z-index: -1;
          top: 78px;
          right: -48px;
          width: 225px;
          height: 225px;
          border: 1px solid rgba(21, 128, 61, 0.09);
          border-radius: 50%;
          content: "";
        }

        .vd-services-hero-inner {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(250px, 0.65fr);
          align-items: center;
          gap: 52px;
        }

        .vd-services-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 23px;
          padding: 9px 13px;
          border: 1px solid #d6eadb;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.82);
          color: var(--vd-green-dark);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.45px;
          text-transform: uppercase;
        }

        .vd-services-eyebrow svg {
          width: 15px;
          height: 15px;
        }

        .vd-services-hero h1 {
          max-width: 760px;
          margin: 0;
          color: var(--vd-ink);
          font-size: clamp(40px, 5.3vw, 66px);
          font-weight: 850;
          line-height: 1.08;
          letter-spacing: -2.8px;
        }

        .vd-services-hero h1 span {
          color: var(--vd-green);
        }

        .vd-services-hero-description {
          max-width: 650px;
          margin: 23px 0 0;
          color: #5d6b61;
          font-size: 17px;
          line-height: 1.85;
        }

        .vd-services-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 30px;
        }

        .vd-services-btn {
          display: inline-flex;
          min-height: 52px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 21px;
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          transition:
            transform 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .vd-services-btn:hover {
          transform: translateY(-2px);
        }

        .vd-services-btn svg {
          width: 17px;
          height: 17px;
        }

        .vd-services-btn-primary {
          background: var(--vd-green);
          box-shadow: 0 8px 20px rgba(21, 128, 61, 0.18);
          color: #ffffff;
        }

        .vd-services-btn-primary:hover {
          background: var(--vd-green-dark);
          box-shadow: 0 12px 25px rgba(21, 128, 61, 0.24);
        }

        .vd-services-btn-secondary {
          border-color: #d8e3da;
          background: #ffffff;
          color: var(--vd-ink);
        }

        .vd-services-btn-secondary:hover {
          border-color: #a6d3b1;
          background: #f8fcf9;
        }

        .vd-services-hero-panel {
          position: relative;
          padding: 29px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.84);
          box-shadow: 0 24px 70px rgba(21, 55, 33, 0.09);
          backdrop-filter: blur(10px);
        }

        .vd-services-panel-icon {
          display: grid;
          width: 57px;
          height: 57px;
          place-items: center;
          margin-bottom: 22px;
          border-radius: 17px;
          background: var(--vd-green-soft);
          color: var(--vd-green);
        }

        .vd-services-panel-icon svg {
          width: 27px;
          height: 27px;
        }

        .vd-services-hero-panel h2 {
          margin: 0;
          color: var(--vd-ink);
          font-size: 22px;
          font-weight: 850;
          line-height: 1.35;
        }

        .vd-services-hero-panel > p {
          margin: 11px 0 23px;
          color: var(--vd-muted);
          font-size: 14px;
          line-height: 1.75;
        }

        .vd-services-panel-benefit {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 13px 0;
          border-top: 1px solid #edf1ed;
          color: #35453a;
          font-size: 13px;
          font-weight: 650;
          line-height: 1.5;
        }

        .vd-services-panel-benefit svg {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          margin-top: 1px;
          color: var(--vd-green);
        }

        .vd-services-trust-strip {
          border-top: 1px solid #e7eee8;
          border-bottom: 1px solid #e7eee8;
          background: #ffffff;
        }

        .vd-services-trust-inner {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          padding: 22px 0;
        }

        .vd-services-trust-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          color: #35453a;
          font-size: 13px;
          font-weight: 750;
          text-align: center;
        }

        .vd-services-trust-item svg {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          color: var(--vd-green);
        }

        .vd-services-section {
          padding: 82px 0 94px;
          background: #ffffff;
        }

        .vd-services-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 28px;
          margin-bottom: 30px;
        }

        .vd-services-section-heading > div:first-child {
          max-width: 650px;
        }

        .vd-services-section-kicker {
          margin-bottom: 12px;
          color: var(--vd-green);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .vd-services-section-heading h2 {
          margin: 0;
          color: var(--vd-ink);
          font-size: clamp(29px, 3.5vw, 43px);
          font-weight: 850;
          line-height: 1.18;
          letter-spacing: -1.5px;
        }

        .vd-services-section-heading p {
          margin: 13px 0 0;
          color: var(--vd-muted);
          font-size: 15px;
          line-height: 1.8;
        }

        .vd-services-count {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border: 1px solid #e2ebe4;
          border-radius: 10px;
          background: #f9fcfa;
          color: #526157;
          font-size: 12px;
          font-weight: 750;
        }

        .vd-services-count strong {
          color: var(--vd-green);
          font-size: 15px;
        }

        .vd-services-search-wrap {
          position: relative;
          max-width: 520px;
          margin-bottom: 28px;
        }

        .vd-services-search-icon {
          position: absolute;
          top: 50%;
          left: 17px;
          width: 19px;
          height: 19px;
          color: #7b897e;
          pointer-events: none;
          transform: translateY(-50%);
        }

        .vd-services-search {
          display: block;
          width: 100%;
          min-height: 54px;
          padding: 0 49px;
          border: 1px solid #dfe7e0;
          border-radius: 12px;
          outline: none;
          background: #ffffff;
          color: var(--vd-ink);
          font: inherit;
          font-size: 14px;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .vd-services-search::placeholder {
          color: #8b968d;
        }

        .vd-services-search:focus {
          border-color: #65b77b;
          box-shadow: 0 0 0 4px rgba(21, 128, 61, 0.08);
        }

        .vd-services-search-clear {
          position: absolute;
          top: 50%;
          right: 11px;
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border: 0;
          border-radius: 8px;
          background: #f0f5f1;
          color: #536157;
          cursor: pointer;
          transform: translateY(-50%);
        }

        .vd-services-search-clear svg {
          width: 16px;
          height: 16px;
        }

        .vd-services-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 21px;
        }

        .vd-service-card {
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 300px;
          flex-direction: column;
          padding: 27px;
          overflow: hidden;
          border: 1px solid var(--vd-border);
          border-radius: 17px;
          background: #ffffff;
          color: inherit;
          text-decoration: none;
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .vd-service-card::after {
          position: absolute;
          right: -35px;
          bottom: -45px;
          width: 115px;
          height: 115px;
          border-radius: 50%;
          background: #f2faf4;
          content: "";
          opacity: 0;
          transition: opacity 220ms ease;
          pointer-events: none;
        }

        .vd-service-card:hover {
          transform: translateY(-5px);
          border-color: #b6dfc0;
          box-shadow: 0 19px 45px rgba(20, 55, 31, 0.085);
        }

        .vd-service-card:hover::after {
          opacity: 1;
        }

        .vd-service-card:focus-visible {
          outline: 3px solid rgba(21, 128, 61, 0.3);
          outline-offset: 3px;
        }

        .vd-service-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 24px;
        }

        .vd-service-icon {
          display: grid;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          place-items: center;
          border: 1px solid #dcefe1;
          border-radius: 15px;
          background: linear-gradient(145deg, #effaf2, #e2f5e7);
          color: var(--vd-green);
          transition:
            background 200ms ease,
            color 200ms ease,
            transform 200ms ease;
        }

        .vd-service-icon svg {
          width: 24px;
          height: 24px;
          stroke-width: 1.8;
        }

        .vd-service-card:hover .vd-service-icon {
          transform: scale(1.04);
          background: var(--vd-green);
          color: #ffffff;
        }

        .vd-service-number {
          padding-top: 5px;
          color: #c1ccc3;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 1px;
        }

        .vd-service-card h3 {
          margin: 0;
          color: var(--vd-ink);
          font-size: 19px;
          font-weight: 850;
          line-height: 1.4;
          letter-spacing: -0.35px;
          overflow-wrap: anywhere;
        }

        .vd-service-card-description {
          margin: 12px 0 24px;
          color: var(--vd-muted);
          font-size: 14px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .vd-service-card-link {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
          color: var(--vd-green);
          font-size: 13px;
          font-weight: 850;
        }

        .vd-service-card-link svg {
          width: 16px;
          height: 16px;
          transition: transform 180ms ease;
        }

        .vd-service-card:hover .vd-service-card-link svg {
          transform: translateX(4px);
        }

        .vd-services-loading {
          display: flex;
          min-height: 200px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--vd-muted);
          font-size: 14px;
        }

        .vd-services-loading svg {
          width: 22px;
          height: 22px;
          color: var(--vd-green);
          animation: vd-services-spin 1s linear infinite;
        }

        @keyframes vd-services-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .vd-services-empty {
          padding: 45px 20px;
          border: 1px dashed #d9e5dc;
          border-radius: 16px;
          background: #fafdfa;
          text-align: center;
        }

        .vd-services-empty-icon {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          margin: 0 auto 16px;
          border-radius: 15px;
          background: var(--vd-green-soft);
          color: var(--vd-green);
        }

        .vd-services-empty-icon svg {
          width: 24px;
          height: 24px;
        }

        .vd-services-empty h3 {
          margin: 0;
          color: var(--vd-ink);
          font-size: 20px;
        }

        .vd-services-empty p {
          margin: 10px 0 18px;
          color: var(--vd-muted);
          font-size: 14px;
          line-height: 1.7;
        }

        .vd-services-empty button {
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid #d5e6d9;
          border-radius: 9px;
          background: #ffffff;
          color: var(--vd-green-dark);
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .vd-services-bottom {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 30px;
          margin-top: 66px;
          padding: 43px;
          overflow: hidden;
          border-radius: 21px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(74, 222, 128, 0.16),
              transparent 33%
            ),
            linear-gradient(120deg, #14211b, #1d3426);
          color: #ffffff;
        }

        .vd-services-bottom::after {
          position: absolute;
          top: -95px;
          right: 190px;
          width: 230px;
          height: 230px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          content: "";
          pointer-events: none;
        }

        .vd-services-bottom-copy {
          position: relative;
          z-index: 1;
        }

        .vd-services-bottom-label {
          margin-bottom: 12px;
          color: #86d69a;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.6px;
          text-transform: uppercase;
        }

        .vd-services-bottom h2 {
          max-width: 650px;
          margin: 0;
          color: #ffffff;
          font-size: clamp(25px, 3.1vw, 35px);
          font-weight: 850;
          line-height: 1.25;
          letter-spacing: -0.8px;
        }

        .vd-services-bottom p {
          max-width: 620px;
          margin: 13px 0 0;
          color: #d0ded3;
          font-size: 14px;
          line-height: 1.8;
        }

        .vd-services-bottom-action {
          position: relative;
          z-index: 1;
          display: inline-flex;
          min-height: 51px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 20px;
          border: 1px solid #8ad79c;
          border-radius: 10px;
          background: #ffffff;
          color: #155c2d;
          font-size: 13px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
          transition:
            transform 180ms ease,
            background 180ms ease;
        }

        .vd-services-bottom-action:hover {
          transform: translateY(-2px);
          background: #effaf2;
        }

        .vd-services-bottom-action svg {
          width: 17px;
          height: 17px;
        }

        @media (max-width: 1000px) {
          .vd-services-hero-inner {
            grid-template-columns: minmax(0, 1fr) 290px;
            gap: 28px;
          }

          .vd-services-hero h1 {
            font-size: clamp(39px, 5vw, 55px);
          }

          .vd-services-hero-panel {
            padding: 24px;
          }

          .vd-services-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .vd-services-bottom {
            padding: 35px;
          }
        }

        @media (max-width: 720px) {
          .vd-services-container {
            width: calc(100% - 34px);
          }

          .vd-services-hero {
            padding: 61px 0 54px;
          }

          .vd-services-hero-inner {
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .vd-services-hero h1 {
            max-width: 620px;
            font-size: clamp(39px, 9vw, 57px);
            letter-spacing: -1.9px;
          }

          .vd-services-hero-description {
            font-size: 15px;
          }

          .vd-services-hero-panel {
            max-width: 490px;
          }

          .vd-services-trust-inner {
            grid-template-columns: 1fr;
            gap: 0;
            padding: 8px 0;
          }

          .vd-services-trust-item {
            justify-content: flex-start;
            padding: 13px 3px;
            text-align: left;
          }

          .vd-services-trust-item + .vd-services-trust-item {
            border-top: 1px solid #edf1ed;
          }

          .vd-services-section {
            padding: 59px 0 65px;
          }

          .vd-services-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 17px;
          }

          .vd-services-section-heading h2 {
            font-size: 33px;
            letter-spacing: -1px;
          }

          .vd-services-search-wrap {
            max-width: none;
          }

          .vd-services-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .vd-service-card {
            min-height: 0;
            padding: 23px;
          }

          .vd-service-card-top {
            margin-bottom: 19px;
          }

          .vd-service-card-description {
            margin-bottom: 20px;
          }

          .vd-services-bottom {
            grid-template-columns: 1fr;
            gap: 25px;
            margin-top: 44px;
            padding: 28px 23px;
            border-radius: 17px;
          }

          .vd-services-bottom-action {
            width: 100%;
          }
        }

        @media (max-width: 390px) {
          .vd-services-container {
            width: calc(100% - 26px);
          }

          .vd-services-hero h1 {
            font-size: 37px;
          }

          .vd-services-actions {
            flex-direction: column;
          }

          .vd-services-btn {
            width: 100%;
          }

          .vd-services-bottom h2 {
            font-size: 26px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vd-services-page *,
          .vd-services-page *::before,
          .vd-services-page *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <section className="vd-services-hero">
        <div className="vd-services-container vd-services-hero-inner">
          <div>
            <div className="vd-services-eyebrow">
              <Sparkles aria-hidden="true" />
              What we can do for you
            </div>

            <h1>
              Practical services.
              <br />
              <span>Real business progress.</span>
            </h1>

            <p className="vd-services-hero-description">
              From websites and digital marketing to sourcing, sales support
              and business assistance, Valuedam Network helps you move your
              ideas and business goals forward.
            </p>

            <div className="vd-services-actions">
              <Link
                to="/request-service"
                className="vd-services-btn vd-services-btn-primary"
              >
                Request a Service
                <ArrowRight aria-hidden="true" />
              </Link>

              <Link
                to="/contact"
                className="vd-services-btn vd-services-btn-secondary"
              >
                <MessageCircle aria-hidden="true" />
                Talk to Our Team
              </Link>
            </div>
          </div>

          <aside className="vd-services-hero-panel">
            <div className="vd-services-panel-icon">
              <BriefcaseBusiness aria-hidden="true" />
            </div>

            <h2>Support built around your needs</h2>

            <p>
              Tell us what you want to achieve. Explore our services and find
              the right starting point for your request.
            </p>

            <div className="vd-services-panel-benefit">
              <CheckCircle2 aria-hidden="true" />
              <span>Services for businesses and individuals</span>
            </div>

            <div className="vd-services-panel-benefit">
              <CheckCircle2 aria-hidden="true" />
              <span>Clear service request process</span>
            </div>

            <div className="vd-services-panel-benefit">
              <CheckCircle2 aria-hidden="true" />
              <span>Room for custom requirements</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="vd-services-trust-strip">
        <div className="vd-services-container vd-services-trust-inner">
          <div className="vd-services-trust-item">
            <ShieldCheck aria-hidden="true" />
            Practical business support
          </div>

          <div className="vd-services-trust-item">
            <Layers3 aria-hidden="true" />
            Multiple service categories
          </div>

          <div className="vd-services-trust-item">
            <MessageCircle aria-hidden="true" />
            Custom requests welcome
          </div>
        </div>
      </section>

      <section className="vd-services-section">
        <div className="vd-services-container">
          <div className="vd-services-section-heading">
            <div>
              <div className="vd-services-section-kicker">
                Explore our services
              </div>

              <h2>How can we help you today?</h2>

              <p>
                Browse the services below, open the one that matches your
                needs, or search for a particular service.
              </p>
            </div>

            {!loading && (
              <div className="vd-services-count">
                <strong>{filteredServices.length}</strong>
                {filteredServices.length === 1 ? "service" : "services"}
              </div>
            )}
          </div>

          <div className="vd-services-search-wrap">
            <Search
              className="vd-services-search-icon"
              aria-hidden="true"
            />

            <input
              type="search"
              className="vd-services-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search services, e.g. website design..."
              aria-label="Search services"
            />

            {searchTerm && (
              <button
                type="button"
                className="vd-services-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear service search"
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="vd-services-loading" role="status">
              <LoaderCircle aria-hidden="true" />
              Loading our services...
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="vd-services-grid">
              {filteredServices.map((service, index) => {
                const ServiceIcon = getServiceIcon(service, index);

                return (
                  <Link
                    key={service.id || service.slug || `service-${index}`}
                    to={`/services/${service.slug || service.id}`}
                    className="vd-service-card"
                  >
                    <div className="vd-service-card-top">
                      <div className="vd-service-icon">
                        <ServiceIcon aria-hidden="true" />
                      </div>

                      <span className="vd-service-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3>{service.title || "Business Service"}</h3>

                    <p className="vd-service-card-description">
                      {service.short_description ||
                        service.description ||
                        "Practical support tailored to your business needs."}
                    </p>

                    <div className="vd-service-card-link">
                      Explore service
                      <ArrowRight aria-hidden="true" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="vd-services-empty">
              <div className="vd-services-empty-icon">
                <Search aria-hidden="true" />
              </div>

              <h3>No matching services found</h3>

              <p>
                Try a different search term, or send us a custom request if
                you need something specific.
              </p>

              <button
                type="button"
                onClick={() => setSearchTerm("")}
              >
                Show all services
              </button>
            </div>
          )}

          <div className="vd-services-bottom">
            <div className="vd-services-bottom-copy">
              <div className="vd-services-bottom-label">
                Need something different?
              </div>

              <h2>
                Your needs may go beyond our listed services.
              </h2>

              <p>
                Tell us what you are trying to accomplish. Submit a custom
                request and our team can review the details and discuss the
                next steps with you.
              </p>
            </div>

            <Link
              to="/request-service"
              className="vd-services-bottom-action"
            >
              Tell Us What You Need
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
