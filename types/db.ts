export type UserRole = 'customer' | 'host' | 'admin';

export type Profile = {
  id: string; // auth.users id
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  host_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type ChargerType = 'ac' | 'dc' | 'tesla' | 'chademo' | 'ccs';

export type Charger = {
  id: string;
  host_id: string;
  title: string;
  address: string;
  description: string | null;
  type: ChargerType;
  power_kw: number | null;
  price_per_kwh: number | null;
  available: boolean;
  lat: number;
  lng: number;
  created_at: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  user_id: string;
  charger_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
};

export type Review = {
  id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Setting = {
  id: number;
  key: string;
  value: any;
  commission_rate: number | null;
  created_at: string;
  updated_at: string;
};


