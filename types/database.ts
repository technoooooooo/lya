export type UserRole = 'user' | 'admin';
export type SubscriptionStatus = 'active' | 'inactive';
export type SubscriptionType = 'paid' | 'promo' | null;

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  subscription_status: SubscriptionStatus;
  subscription_type: SubscriptionType;
  created_at: string;
  updated_at: string;
}
