require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Pass supabase instance to routes via req.app.locals or just export
app.set('supabase', supabase);

// Routes
const authMiddleware = require('./routes/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Apply routes
app.use('/api', authMiddleware, apiRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
