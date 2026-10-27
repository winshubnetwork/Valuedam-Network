
import { supabase } from '../lib/supabase';

const VISITOR_TOKEN_KEY = 'valuedam_affiliate_visitor_token';
const REFERRAL_KEY = 'valuedam_affiliate_referral';

function getOrCreateVisitorToken() {
  let token = localStorage.getItem(VISITOR_TOKEN_KEY);

  if (!token) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    token = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    localStorage.setItem(VISITOR_TOKEN_KEY, token);
  }

  return token;
}

async function hashVisitorToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export function getStoredAffiliateReferral() {
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);

    if (!raw) return null;

    const referral = JSON.parse(raw);

    if (
      !referral ||
      typeof referral.id !== 'string' ||
      typeof referral.tokenHash !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(referral.tokenHash)
    ) {
      return null;
    }

    return referral;
  } catch {
    return null;
  }
}

export async function captureAffiliateReferral(referralCode, landingPath) {
  if (!referralCode || typeof window === 'undefined') return null;

  try {
    const token = getOrCreateVisitorToken();
    const tokenHash = await hashVisitorToken(token);

    const { data: referralId, error } = await supabase.rpc(
      'store_affiliate_record_referral',
      {
        p_referral_code: referralCode,
        p_landing_path: String(landingPath || '/').slice(0, 1000),
        p_visitor_token_hash: tokenHash,
      }
    );

    if (error) {
      console.warn('Affiliate referral could not be recorded:', error.message);
      return null;
    }

    if (!referralId) return null;

    const referral = {
      id: referralId,
      tokenHash,
      capturedAt: new Date().toISOString(),
    };

    localStorage.setItem(REFERRAL_KEY, JSON.stringify(referral));

    return referral;
  } catch (error) {
    console.warn('Affiliate referral tracking failed:', error);
    return null;
  }
}

export async function refreshStoredAffiliateReferral() {
  const referral = getStoredAffiliateReferral();

  if (!referral) return null;

  try {
    const token = localStorage.getItem(VISITOR_TOKEN_KEY);

    if (!token) return null;

    const tokenHash = await hashVisitorToken(token);

    if (tokenHash !== referral.tokenHash) return null;

    return referral;
  } catch {
    return null;
  }
}
