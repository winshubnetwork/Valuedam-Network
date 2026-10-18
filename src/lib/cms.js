import { supabase } from './supabase';

export async function getSiteSettings() {
  const { data } = await supabase.from('site_settings').select('*').maybeSingle();
  return data || {};
}

export async function getHomepageContent() {
  const { data } = await supabase.from('homepage_content').select('*').maybeSingle();
  return data || {};
}

export async function getServices() {
  const { data } = await supabase.from('services').select('*').eq('active', true).order('sort_order');
  return (data || []).map(s => ({ ...s, short: s.short_description || s.description || '' }));
}

export async function getService(slug) {
  const { data } = await supabase.from('services').select('*').eq('slug', slug).eq('active', true).maybeSingle();
  return data ? { ...data, short: data.short_description || data.description || '' } : data;
}

export async function getPortfolio() {
  const { data } = await supabase.from('portfolio_projects').select('*').eq('active', true).order('sort_order');
  return data || [];
}

export async function getTestimonials() {
  const { data } = await supabase.from('testimonials').select('*').eq('active', true).order('created_at');
  return (data || []).map(t => ({ ...t, quote: t.content || '' }));
}
