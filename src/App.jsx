import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';

// Admin shell
const AdminShell = lazy(() => import('./admin/AdminShell'));

// Admin pages
const BlogComments = lazy(() => import('./pages/admin/BlogComments'));
const ReceiptPrint = lazy(() => import('./pages/admin/ReceiptPrint'));
const Payments = lazy(() => import('./pages/admin/Payments'));
const InvoicePrint = lazy(() => import('./pages/admin/InvoicePrint'));
const Invoices = lazy(() => import('./pages/admin/Invoices'));
const JobDetails = lazy(() => import('./pages/admin/JobDetails'));
const QuotePrint = lazy(() => import('./pages/admin/QuotePrint'));
const Quotes = lazy(() => import('./pages/admin/Quotes'));
const SalesPipeline = lazy(() => import('./pages/admin/SalesPipeline'));
const ContactMessages = lazy(() => import('./pages/admin/ContactMessages'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const BlogAdmin = lazy(() => import('./pages/admin/BlogAdmin'));
const Jobs = lazy(() => import('./pages/admin/Jobs'));
const BlogCategories = lazy(() => import('./pages/admin/BlogCategories'));
const Login = lazy(() => import('./pages/admin/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Homepage = lazy(() => import('./pages/admin/Homepage'));
const ServicesAdmin = lazy(() => import('./pages/admin/ServicesAdmin'));
const PortfolioAdmin = lazy(() => import('./pages/admin/PortfolioAdmin'));
const TestimonialsAdmin = lazy(() => import('./pages/admin/TestimonialsAdmin'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const ServiceRequests = lazy(() => import('./admin/ServiceRequests'));

// Public pages
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Contact = lazy(() => import('./pages/Contact'));
const RequestService = lazy(() => import('./pages/RequestService'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteLoading() {
  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(0,0,0,0.12)',
          borderTopColor: 'currentColor',
          borderRadius: '50%',
          animation: 'valuedam-route-spin 0.8s linear infinite',
        }}
      />

      <style>{`
        @keyframes valuedam-route-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function LazyRoute({ children }) {
  return (
    <Suspense fallback={<RouteLoading />}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>

      {/* PUBLIC WEBSITE */}
      <Route element={<Layout />}>

        <Route
          path="/"
          element={
            <LazyRoute>
              <Home />
            </LazyRoute>
          }
        />

        <Route
          path="/about"
          element={
            <LazyRoute>
              <About />
            </LazyRoute>
          }
        />

        <Route
          path="/services"
          element={
            <LazyRoute>
              <Services />
            </LazyRoute>
          }
        />

        <Route
          path="/services/:slug"
          element={
            <LazyRoute>
              <ServiceDetail />
            </LazyRoute>
          }
        />

        <Route
          path="/portfolio"
          element={
            <LazyRoute>
              <Portfolio />
            </LazyRoute>
          }
        />

        <Route
          path="/blog"
          element={
            <LazyRoute>
              <Blog />
            </LazyRoute>
          }
        />

        <Route
          path="/blog/:slug"
          element={
            <LazyRoute>
              <BlogPost />
            </LazyRoute>
          }
        />

        <Route
          path="/contact"
          element={
            <LazyRoute>
              <Contact />
            </LazyRoute>
          }
        />

        <Route
          path="/request-service"
          element={
            <LazyRoute>
              <RequestService />
            </LazyRoute>
          }
        />

        <Route
          path="*"
          element={
            <LazyRoute>
              <NotFound />
            </LazyRoute>
          }
        />

      </Route>

      {/* ADMIN LOGIN */}
      <Route
        path="/admin/login"
        element={
          <LazyRoute>
            <Login />
          </LazyRoute>
        }
      />

      {/* ADMIN APPLICATION */}
      <Route
        element={
          <LazyRoute>
            <AdminShell />
          </LazyRoute>
        }
      >

        <Route
          path="/admin"
          element={
            <LazyRoute>
              <Dashboard />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/homepage"
          element={
            <LazyRoute>
              <Homepage />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/customers"
          element={
            <LazyRoute>
              <Customers />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/services"
          element={
            <LazyRoute>
              <ServicesAdmin />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/portfolio"
          element={
            <LazyRoute>
              <PortfolioAdmin />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/testimonials"
          element={
            <LazyRoute>
              <TestimonialsAdmin />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/requests"
          element={
            <LazyRoute>
              <ServiceRequests />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/pipeline"
          element={
            <LazyRoute>
              <SalesPipeline />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/quotes"
          element={
            <LazyRoute>
              <Quotes />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/invoices"
          element={
            <LazyRoute>
              <Invoices />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/payments"
          element={
            <LazyRoute>
              <Payments />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/jobs"
          element={
            <LazyRoute>
              <Jobs />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/blog"
          element={
            <LazyRoute>
              <BlogAdmin />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/blog/comments"
          element={
            <LazyRoute>
              <BlogComments />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/messages"
          element={
            <LazyRoute>
              <ContactMessages />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/blog/categories"
          element={
            <LazyRoute>
              <BlogCategories />
            </LazyRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <LazyRoute>
              <Settings />
            </LazyRoute>
          }
        />

      </Route>

      {/* STANDALONE ADMIN PAGES */}

      <Route
        path="/admin/jobs/view"
        element={
          <LazyRoute>
            <JobDetails />
          </LazyRoute>
        }
      />

      <Route
        path="/admin/quotes/print"
        element={
          <LazyRoute>
            <QuotePrint />
          </LazyRoute>
        }
      />

      <Route
        path="/admin/invoices/print"
        element={
          <LazyRoute>
            <InvoicePrint />
          </LazyRoute>
        }
      />

      <Route
        path="/admin/receipts/print"
        element={
          <LazyRoute>
            <ReceiptPrint />
          </LazyRoute>
        }
      />

    </Routes>
  );
}