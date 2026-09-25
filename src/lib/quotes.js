import { supabase } from "./supabase";

export async function submitQuote(form) {
  if (supabase) {
    const { data, error } = await supabase
      .from("quote_requests")
      .insert([{
        name: form.name,
        business: form.business,
        email: form.email,
        phone: form.phone,
        service: form.service,
        budget: form.budget,
        timeline: form.timeline,
        message: form.message,
        status: "new"
      }])
      .select()
      .single();

    if (!error) return { ok: true, data };
  }

  const to = import.meta.env.VITE_CONTACT_EMAIL || "hello@valuedam.com.ng";
  const subject = encodeURIComponent(`Quote Request — ${form.service}`);
  const body = encodeURIComponent(
`Name: ${form.name}
Business: ${form.business || "-"}
Email: ${form.email}
Phone/WhatsApp: ${form.phone}
Service: ${form.service}
Budget: ${form.budget || "-"}
Timeline: ${form.timeline || "-"}

Project details:
${form.message}`
  );
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  return { ok: true, fallback: true };
}