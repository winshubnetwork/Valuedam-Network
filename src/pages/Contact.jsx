import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    if (submitting) return;

    setStatus('');

    if (!supabase) {
      setStatus(
        'Supabase is not configured yet. Please add your environment variables.'
      );
      return;
    }

    if (!form.name.trim()) {
      setStatus('Please enter your name.');
      return;
    }

    if (!form.email.trim()) {
      setStatus('Please enter your email address.');
      return;
    }

    if (!form.message.trim()) {
      setStatus('Please enter your message.');
      return;
    }

    setSubmitting(true);
    setStatus('Sending...');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim(),
      status: 'new',
    };

    const { error } = await supabase
      .from('contact_messages')
      .insert(payload);

    if (error) {
      console.error('Contact message error:', error);
      setStatus(
        'We could not send your message. Please try again.'
      );
      setSubmitting(false);
      return;
    }

    setForm({
      name: '',
      email: '',
      phone: '',
      message: '',
    });

    setStatus(
      'Message sent successfully. We will get back to you.'
    );

    setSubmitting(false);
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">CONTACT</span>

          <h1>Let’s talk about what you need.</h1>

          <p>
            Have a question, project or business task? Send us a message.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-grid">
          <div>
            <h2>Start a conversation</h2>

            <p>
              For a detailed service request, use our request form.
            </p>

            <Link
              className="btn primary"
              to="/request-service"
            >
              Request a service →
            </Link>

            <div className="contact-info">
              <p>
                <b>Email</b>
                <br />
                hello@valuedam.com.ng
              </p>

              <p>
                <b>WhatsApp</b>
                <br />
                Contact us for the current business WhatsApp number.
              </p>
            </div>
          </div>

          <form
            className="form-card"
            onSubmit={submit}
          >
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) =>
                  updateField('name', e.target.value)
                }
              />
            </label>

            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  updateField('email', e.target.value)
                }
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) =>
                  updateField('phone', e.target.value)
                }
              />
            </label>

            <label>
              Message
              <textarea
                required
                rows="6"
                value={form.message}
                onChange={(e) =>
                  updateField('message', e.target.value)
                }
              />
            </label>

            <button
              className="btn primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send message'}
            </button>

            {status && (
              <p className="form-status">
                {status}
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
}