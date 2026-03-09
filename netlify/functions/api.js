const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const authMiddleware = require('../../routes/auth');
const apiRoutes = require('../../routes/api');
const adminRoutes = require('../../routes/admin');

const app = express();

app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
app.set('supabase', supabase);

// Public route (no auth needed)
app.get('/api/wallets', async (req, res) => {
    const { data, error } = await supabase.from('wallets').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Protected routes
app.use('/api', authMiddleware, apiRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports.handler = serverless(app);
