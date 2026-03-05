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
  created_at: string;
  updated_at: string;
}
