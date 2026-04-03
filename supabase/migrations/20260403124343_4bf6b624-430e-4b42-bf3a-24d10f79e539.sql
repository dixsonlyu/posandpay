
-- 1. membership_tiers table
CREATE TABLE public.membership_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_zh text,
  min_spend numeric NOT NULL DEFAULT 0,
  min_visits integer NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  top_up_bonus_pct numeric NOT NULL DEFAULT 0,
  perks text[] DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on membership_tiers" ON public.membership_tiers FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on membership_tiers" ON public.membership_tiers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on membership_tiers" ON public.membership_tiers FOR UPDATE TO public USING (true);

-- 2. member_wallet_transactions table
CREATE TABLE public.member_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('top_up', 'bonus', 'payment', 'refund')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  reference_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on member_wallet_transactions" ON public.member_wallet_transactions FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Add stored_balance and total_top_up to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS stored_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_top_up numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spend numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS average_ticket numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_items text[] DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;

-- 4. Add serve_together to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS serve_together boolean NOT NULL DEFAULT false;

-- 5. Add reservation fields to restaurant_tables
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS reservation_phone text;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS reservation_at timestamptz;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS reservation_notes text;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS linked_customer_id text;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS linked_customer_name text;

-- 6. Seed default membership tiers
INSERT INTO public.membership_tiers (id, name, name_zh, min_spend, min_visits, discount_pct, top_up_bonus_pct, perks, sort_order) VALUES
  ('tier-bronze', 'Bronze', '铜卡', 0, 0, 0, 0, '{"Welcome drink"}', 0),
  ('tier-silver', 'Silver', '银卡', 300, 5, 5, 3, '{"5% discount","Birthday treat"}', 1),
  ('tier-gold', 'Gold', '金卡', 1000, 15, 10, 5, '{"10% discount","Priority seating","Birthday treat"}', 2),
  ('tier-platinum', 'Platinum', '铂金卡', 3000, 30, 15, 8, '{"15% discount","VIP lounge","Dedicated server","Birthday treat"}', 3);
