import React, { useEffect, useState } from 'react';
import { portfolio as fallback } from '../data';
import { getPortfolio } from '../lib/cms';

export default function Portfolio() {
  const [items, setItems] = useState(fallback);

  useEffect(() => {
    getPortfolio().then((x) => {
      if (x.length) setItems(x);
    });
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">PORTFOLIO</span>
          <h1>Selected work and project examples.</h1>
          <p>
            A growing collection of digital, content and business-support
            projects.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container portfolio-grid">
          {items.map((p, i) => (
            <article
              className="portfolio-card big"
              key={p.id || i}
            >
              <div className="portfolio-image">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  String(i + 1).padStart(2, '0')
                )}
              </div>

              <div>
                <small>{p.category}</small>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}