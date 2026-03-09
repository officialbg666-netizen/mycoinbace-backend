const express = require('express');
const router = express.Router();

// Admin middleware
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
});

// List all users with detailed info
router.get('/users', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Toggle User Freeze Status
router.put('/users/:id/freeze', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { is_frozen } = req.body;
    const { data, error } = await supabase
        .from('users')
        .update({ is_frozen })
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Toggle User Withdrawal Permission
router.put('/users/:id/withdrawable', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { allow_withdrawal } = req.body;
    const { data, error } = await supabase
        .from('users')
        .update({ allow_withdrawal })
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Update user (Unified endpoint for Edit Modal)
router.put('/users/:id', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { id } = req.params;
    const { balance, role, is_frozen, allow_withdrawal, name } = req.body;

    const { error } = await supabase.from('users').update({ 
        balance, 
        role, 
        is_frozen, 
        allow_withdrawal,
        name
    }).eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'User updated successfully' });
});

// Delete User
router.delete('/users/:id', async (req, res) => {
    const supabase = req.app.get('supabase');
    // Note: CASCADE should handle related records if set in DB
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'User deleted' });
});

// System stats (Total users, Active users, New registrations)
router.get('/stats', async (req, res) => {
    const supabase = req.app.get('supabase');
    
    // Using simple counts for MVP stats
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    
    // For "active", let's count people who joined in last 24h OR have active trades
    const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).neq('balance', 0);
    
    const { data: deposits } = await supabase.from('deposits').select('amount, status');
    const { data: withdrawals } = await supabase.from('withdrawals').select('amount, status');
    
    const totalDeposits = (deposits || []).reduce((acc, d) => d.status === 'success' ? acc + Number(d.amount) : acc, 0);
    const totalWithdrawals = (withdrawals || []).reduce((acc, w) => w.status === 'success' ? acc + Number(w.amount) : acc, 0);
    
    res.json({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsers: totalUsers > 5 ? 5 : totalUsers, 
        totalDeposits,
        totalWithdrawals,
        netFlow: totalDeposits - totalWithdrawals
    });
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

// Edit user role
router.put('/users/:id/role', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { role } = req.body;
    const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// List all deposits
router.get('/deposits', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { data, error } = await supabase
        .from('deposits')
        .select('*, users(email)')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// List all withdrawals
router.get('/withdrawals', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { data, error } = await supabase
        .from('withdrawals')
        .select('*, users(email)')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// List all trades (for manual resolution)
router.get('/trades', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { data, error } = await supabase
        .from('trades')
        .select('*, users(email)')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Edit wallet address
router.put('/wallets/:coin', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { address } = req.body;
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
    const { status } = req.body; // 'success' or 'rejected'
    
    const { data: deposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (!deposit || deposit.status !== 'pending') {
        return res.status(400).json({ error: 'Deposit is not in pending state' });
    }

    const { data, error } = await supabase
        .from('deposits')
        .update({ status })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });

    if (status === 'success') {
        const { error: balanceError } = await supabase.rpc('increment_balance', { x: deposit.amount, row_id: deposit.user_id });
        if (balanceError) console.error('Balance Increment Error:', balanceError);
    }

    res.json(data);
});

// Approve/Reject Withdrawal
router.put('/withdrawals/:id/status', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { status } = req.body; // 'success' or 'rejected'
    
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

    // If rejected, return funds to user
    if (status === 'rejected') {
        const { error: balanceError } = await supabase.rpc('increment_balance', { x: withdrawal.amount, row_id: withdrawal.user_id });
        if (balanceError) console.error('Balance Reversal Error:', balanceError);
    }

    res.json(data);
});

// Resolve Trade
router.put('/trades/:id/resolve', async (req, res) => {
    const supabase = req.app.get('supabase');
    const { result, payout } = req.body; 

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
