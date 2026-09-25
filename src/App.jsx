import React, { useMemo, useState } from "react";
import {
  ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronDown, Globe,
  Laptop, Mail, MapPin, Megaphone, Menu, MessageCircle, Phone,
  Send, ShoppingBag, Sparkles, Truck, X, ShieldCheck
} from "lucide-react";
import { services } from "./data/services";
import { site } from "./data/site";
import { submitQuote } from "./lib/quotes";

const iconMap = { Globe, ShoppingBag, Laptop, BriefcaseBusiness, Truck, Megaphone };

function Header({ onQuote }) {
  const [open, setOpen] = useState(false);
  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header className="header">
      <div className="container nav">
        <button className="brand" onClick={() => go("home")} aria-label="ValueDam Network home">
          <span className="brand-mark">V</span>
          <span><strong>ValueDam</strong><small>NETWORK</small></span>
        </button>
        <nav className={open ? "nav-links open" : "nav-links"}>
          <button onClick={() => go("services")}>Services</button>
          <button onClick={() => go("about")}>About</button>
          <button onClick={() => go("process")}>How it works</button>
          <button onClick={() => go("contact")}>Contact</button>
          <button className="mobile-quote" onClick={() => { setOpen(false); onQuote(); }}>Request a Quote</button>
        </nav>
        <button className="nav-cta" onClick={onQuote}>Request a Quote <ArrowRight size={16}/></button>
        <button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
      </div>
    </header>
  );
}

function ServiceCard({ service, onQuote }) {
  const Icon = iconMap[service.icon] || Globe;
  return (
    <article className="service-card">
      <div className="icon-box"><Icon size={23}/></div>
      <span className="eyebrow">{service.category}</span>
      <h3>{service.title}</h3>
      <p>{service.short}</p>
      <button className="text-button" onClick={() => onQuote(service.title)}>
        Request this service <ArrowRight size={16}/>
      </button>
    </article>
  );
}

function QuoteModal({ initialService, onClose }) {
  const [form, setForm] = useState({
    name: "", business: "", email: "", phone: "", service: initialService || services[0].title,
    budget: "", timeline: "", message: ""
  });
  const [state, setState] = useState("idle");

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState("sending");
    try {
      await submitQuote(form);
      setState("success");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X/></button>
        {state === "success" ? (
          <div className="success-state">
            <CheckCircle2 size={52}/>
            <h2>Request prepared successfully</h2>
            <p>Your quote request has been prepared. We'll be able to review your project details and get back to you.</p>
            <button className="primary-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="modal-head">
              <span className="eyebrow">Let's work together</span>
              <h2>Request a Quote</h2>
              <p>Tell us what you need. We'll review your request and contact you.</p>
            </div>
            <form onSubmit={submit} className="quote-form">
              <div className="form-grid">
                <label>Name *<input required name="name" value={form.name} onChange={update} placeholder="Your name"/></label>
                <label>Business / Company<input name="business" value={form.business} onChange={update} placeholder="Business name"/></label>
                <label>Email *<input required type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com"/></label>
                <label>Phone / WhatsApp *<input required name="phone" value={form.phone} onChange={update} placeholder="+234..."/></label>
                <label>Service *<select required name="service" value={form.service} onChange={update}>
                  {services.map(s => <option key={s.id}>{s.title}</option>)}
                </select></label>
                <label>Budget (optional)<input name="budget" value={form.budget} onChange={update} placeholder="e.g. ₦150,000"/></label>
                <label>Preferred timeline<input name="timeline" value={form.timeline} onChange={update} placeholder="e.g. 2–4 weeks"/></label>
              </div>
              <label>Tell us about your project *<textarea required name="message" value={form.message} onChange={update} rows="5" placeholder="What do you need us to help you with?"/></label>
              {state === "error" && <p className="form-error">Something went wrong. Please try again or contact us directly.</p>}
              <button className="primary-btn wide" disabled={state === "sending"} type="submit">
                {state === "sending" ? "Preparing..." : "Send Quote Request"} <Send size={17}/>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const featured = useMemo(() => services.filter(s => s.featured), []);

  const openQuote = (service = "") => {
    setSelectedService(service);
    setQuoteOpen(true);
  };
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hello ValueDam Network, I would like to enquire about your services.")}`;

  return (
    <>
      <Header onQuote={() => openQuote()} />
      <main>
        <section id="home" className="hero">
          <div className="hero-glow glow-one"></div><div className="hero-glow glow-two"></div>
          <div className="container hero-grid">
            <div>
              <div className="pill"><Sparkles size={15}/> Practical solutions for business & growth</div>
              <h1>We help turn <span>ideas into value.</span></h1>
              <p className="hero-copy">{site.description}</p>
              <div className="hero-actions">
                <button className="primary-btn" onClick={() => openQuote()}>Request a Quote <ArrowRight size={17}/></button>
                <a className="secondary-btn" href="#services">Explore Services <ChevronDown size={17}/></a>
              </div>
              <div className="trust-row">
                <span><ShieldCheck size={18}/> Practical</span>
                <span><ShieldCheck size={18}/> Flexible</span>
                <span><ShieldCheck size={18}/> Client-focused</span>
              </div>
            </div>
            <div className="hero-panel">
              <div className="panel-top"><span>VALUEDAM NETWORK</span><span className="live-dot"></span></div>
              <div className="panel-content">
                <div className="mini-stat"><span>Services</span><strong>{services.length}+</strong></div>
                <div className="mini-stat"><span>Focus</span><strong>Value</strong></div>
                <div className="mini-stat"><span>Reach</span><strong>Nigeria</strong></div>
                <div className="quote-card">
                  <div className="quote-avatar">V</div>
                  <div><strong>Have a project?</strong><span>Tell us what you need.</span></div>
                  <button onClick={() => openQuote()}><ArrowRight size={18}/></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section">
          <div className="container">
            <div className="section-heading">
              <div><span className="eyebrow">What we offer</span><h2>Services built around your needs.</h2></div>
              <p>Explore our current services and request a quote for the solution you need.</p>
            </div>
            <div className="service-grid">{featured.map(s => <ServiceCard key={s.id} service={s} onQuote={openQuote}/>)}</div>
            <div className="service-grid all-services">{services.filter(s => !s.featured).map(s => <ServiceCard key={s.id} service={s} onQuote={openQuote}/>)}</div>
          </div>
        </section>

        <section id="about" className="section dark-section">
          <div className="container about-grid">
            <div><span className="eyebrow light">About ValueDam Network</span><h2>One network. Multiple ways to create value.</h2></div>
            <div>
              <p>ValueDam Network is built around practical solutions that help individuals and businesses connect, operate, grow and take advantage of digital opportunities.</p>
              <p>We combine technology, business support, digital services and logistics capabilities to create useful solutions for real-world needs.</p>
              <button className="outline-btn" onClick={() => openQuote()}>Discuss your project <ArrowRight size={16}/></button>
            </div>
          </div>
        </section>

        <section id="process" className="section">
          <div className="container">
            <div className="section-heading centered"><span className="eyebrow">Simple process</span><h2>From request to solution.</h2></div>
            <div className="steps">
              {[
                ["01", "Tell us what you need", "Send a service enquiry or request a quote with your project details."],
                ["02", "We discuss the project", "We'll review your needs and contact you to clarify scope and expectations."],
                ["03", "You receive a proposal", "We'll discuss the appropriate solution, pricing and timeline for the work."],
                ["04", "We get to work", "Once everything is agreed, we move forward with the project."]
              ].map(([n,t,d]) => <div className="step" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>)}
            </div>
          </div>
        </section>

        <section id="contact" className="contact-section">
          <div className="container contact-card">
            <div><span className="eyebrow light">Let's talk</span><h2>Have a project in mind?</h2><p>Tell us what you're looking for and let's discuss how ValueDam Network can help.</p></div>
            <div className="contact-actions">
              <button className="primary-btn" onClick={() => openQuote()}>Request a Quote <ArrowRight size={17}/></button>
              <a className="whatsapp-btn" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18}/> WhatsApp Us</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div><div className="brand footer-brand"><span className="brand-mark">V</span><span><strong>ValueDam</strong><small>NETWORK</small></span></div><p>{site.tagline}</p></div>
          <div><h4>Contact</h4><a href={`mailto:${site.email}`}><Mail size={15}/> {site.email}</a><a href={`tel:${site.phone}`}><Phone size={15}/> {site.phone}</a><span><MapPin size={15}/> {site.location}</span></div>
          <div><h4>Quick links</h4><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a></div>
        </div>
        <div className="container footer-bottom"><span>© {new Date().getFullYear()} ValueDam Network. All rights reserved.</span><span>Connecting, Informing, and Empowering.</span></div>
      </footer>

      <a className="floating-whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><MessageCircle/></a>
      {quoteOpen && <QuoteModal initialService={selectedService} onClose={() => setQuoteOpen(false)}/>}
    </>
  );
}

export default App;