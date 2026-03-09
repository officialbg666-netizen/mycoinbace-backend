const express = require('express');
const router = express.Router();

// Admin middleware
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
});

// List all users
router.get('/users', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Edit user balance
router.put('/users/:id/balance', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { balance } = req.body;
    const { data, error } = await supabase
        .from('users')
        .update({ balance })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Edit wallet address
router.put('/wallets/:coin', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { address } = req.body;
    // Upsert or update
    const { data, error } = await supabase
        .from('wallets')
        .update({ address })
        .eq('coin', req.params.coin.toUpperCase())
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Approve/Reject Deposit
router.put('/deposits/:id/status', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { status } = req.body; // 'approved' or 'rejected'
    
    // Get deposit first
    const { data: deposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (!deposit || deposit.status !== 'pending') {
        return res.status(400).json({ error: 'Invalid deposit' });
    }

    const { data, error } = await supabase
        .from('deposits')
        .update({ status })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });

    if (status === 'approved') {
        await supabase.rpc('increment_balance', { x: deposit.amount, row_id: deposit.user_id });
    }

    res.json(data);
});

// Approve/Reject Withdrawal
router.put('/withdrawals/:id/status', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { status } = req.body; // 'approved' or 'rejected'
    
    const { data: withdrawal } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (!withdrawal || withdrawal.status !== 'pending') {
         return res.status(400).json({ error: 'Invalid withdrawal' });
    }

    const { data, error } = await supabase
        .from('withdrawals')
        .update({ status })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });

    if (status === 'rejected') {
        // Refund the deducted amount
        await supabase.rpc('increment_balance', { x: withdrawal.amount, row_id: withdrawal.user_id });
    }

    res.json(data);
});

// Resolve Trade
router.put('/trades/:id/resolve', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { result, payout } = req.body; // 'win', 'loss'

    const { data: trade } = await supabase
        .from('trades')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (!trade || trade.result !== 'pending') {
        return res.status(400).json({ error: 'Invalid trade' });
    }

    const { data, error } = await supabase
        .from('trades')
        .update({ result })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });

    if (result === 'win') {
        await supabase.rpc('increment_balance', { x: payout || (trade.amount * 1.8), row_id: trade.user_id });
    }

    res.json(data);
});

module.exports = router;
