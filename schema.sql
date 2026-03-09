-- This SQL script needs to be executed in the Supabase SQL Editor.

-- Users table (maps to auth.users implicitly)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 10,
    role TEXT DEFAULT 'user', -- 'user', 'admin'
    is_frozen BOOLEAN DEFAULT FALSE,
    allow_withdrawal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Wallets table for deposits
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Seed available coins
INSERT INTO wallets (coin, address) VALUES 
('USDT', 'YOUR_USDT_ADDRESS_HERE'),
('BTC', 'YOUR_BTC_ADDRESS_HERE'),
('ETH', 'YOUR_ETH_ADDRESS_HERE'),
('BNB', 'YOUR_BNB_ADDRESS_HERE'),
('LTC', 'YOUR_LTC_ADDRESS_HERE'),
('XRP', 'YOUR_XRP_ADDRESS_HERE'),
('ADA', 'YOUR_ADA_ADDRESS_HERE');

-- Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    duration INT NOT NULL,
    result TEXT DEFAULT 'pending', -- 'pending', 'win', 'loss'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Deposits table
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    coin TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Withdrawals table
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    coin TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    address TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- RPC function to increment balance
CREATE OR REPLACE FUNCTION increment_balance(x numeric, row_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users SET balance = balance + x WHERE id = row_id;
END;
$$;

-- RPC function to decrement balance
CREATE OR REPLACE FUNCTION decrement_balance(x numeric, row_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users SET balance = balance - x WHERE id = row_id;
END;
$$;

-- RLS policies to allow authenticated users to perform select/insert operations, and service role to bypass.
-- For simplicity in this demo, you can disable RLS completely, or properly set policies.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
