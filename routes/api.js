const express = require('express');
const router = express.Router();

// Get User Profile
router.get('/user/profile', async (req, res) => {
    res.json(req.user);
});

// Update Profile on Register (Create custom user row)
router.post('/user/profile', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { id, email } = req.user;
    
    // Attempt to insert, ignore if already exists
    const { data, error } = await supabase
        .from('users')
        .insert([{ id, email, balance: 0, role: 'user' }])
        .select()
        .single();

    if (error && error.code !== '23505') { // 23505 is unique violation in Postgres
        return res.status(500).json({ error: error.message });
    }
    res.json(data || req.user);
});

// Get Deposit Wallets
router.get('/wallets', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { data, error } = await supabase.from('wallets').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Submit Deposit Request
router.post('/deposit', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { coin, amount } = req.body;
    
    if (req.user.is_frozen) {
        return res.status(403).json({ error: 'Your account is currently frozen. Please contact customer support.' });
    }

    const { data, error } = await supabase
        .from('deposits')
        .insert([{ user_id: req.user.id, coin, amount, status: 'pending' }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Submit Withdrawal Request
router.post('/withdraw', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { coin, amount, address } = req.body;
    
    if (req.user.is_frozen) {
        return res.status(403).json({ error: 'Your account is currently frozen. Payouts are temporarily suspended.' });
    }

    if (req.user.allow_withdrawal === false) {
        return res.status(403).json({ error: 'Withdrawal permission is currently disabled for your account. Please consult support.' });
    }
    
    if (req.user.balance < amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid withdrawal amount or insufficient balance.' });
    }

    const { data, error } = await supabase
        .from('withdrawals')
        .insert([{ user_id: req.user.id, coin, amount, address, status: 'pending' }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    
    // Deduct balance locally for pending withdrawal
    await supabase.rpc('decrement_balance', { x: amount, row_id: req.user.id });
    
    res.json(data);
});

// Submit Trade
router.post('/trade', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { asset, amount, duration } = req.body;
    
    if (req.user.is_frozen) {
        return res.status(403).json({ error: 'Account frozen. Trading activities are currently restricted.' });
    }

    if (req.user.balance < amount || amount <= 0) {
        return res.status(400).json({ error: 'Insufficient funds to open this contract.' });
    }

    const { data, error } = await supabase
        .from('trades')
        .insert([{ user_id: req.user.id, asset, amount, duration, result: 'pending' }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    
    // Deduct trade amount from balance
    await supabase.rpc('decrement_balance', { x: amount, row_id: req.user.id });

    res.json(data);
});

module.exports = router;
