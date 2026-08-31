export type UserRole = 'user' | 'admin';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due';
export type SubscriptionType = 'paid' | 'promo' | null;

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  subscription_status: SubscriptionStatus;
  subscription_type: SubscriptionType;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  golf_club: string | null;
  stripe_customer_id: string | null;
  // Dérivés des access_grants par trigger — ne jamais écrire directement.
  access_until: string | null;
  has_lifetime_access: boolean;
  access_source: AccessSource | null;
  payment_state: PaymentState;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Socle commercial (migration 017)
// ---------------------------------------------------------------------------

export type OfferMode = 'subscription' | 'payment';
export type RecurringInterval = 'day' | 'week' | 'month' | 'year';
/** 'period' = calé sur la période Stripe, 'duration' = durée fixe, 'lifetime' = sans terme. */
export type AccessKind = 'period' | 'duration' | 'lifetime';
export type OfferVisibility = 'public' | 'private';
export type OfferEligibility = 'all' | 'alumni' | 'academy';

export interface Offer {
  id: string;
  internal_name: string;
  display_name: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  mode: OfferMode;
  recurring_interval: RecurringInterval | null;
  recurring_interval_count: number;
  trial_days: number | null;
  amount_cents: number;
  currency: string;
  compare_at_cents: number | null;
  access_kind: AccessKind;
  /** Intervalle Postgres sérialisé (ex. "12 mons"), null hors access_kind = 'duration'. */
  access_duration: string | null;
  visibility: OfferVisibility;
  slug: string | null;
  eligibility: OfferEligibility;
  available_from: string | null;
  available_until: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type AccessSource =
  | 'stripe_subscription'
  | 'stripe_payment'
  | 'academy'
  | 'manual'
  | 'promo';

export type PaymentState = 'ok' | 'past_due';

export interface AccessGrant {
  id: string;
  user_id: string;
  source: AccessSource;
  offer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  starts_at: string;
  /** null = sans terme (lifetime, accès offert sans date de fin). */
  ends_at: string | null;
  revoked_at: string | null;
  payment_state: PaymentState;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
