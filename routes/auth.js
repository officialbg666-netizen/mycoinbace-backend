const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token found' });

    const supabase = req.app.get('supabase');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Fetch custom profile/role from users table
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    // If user is freshly registered, profile might not exist yet, they exist in auth.users though.
    req.user = profile || { id: user.id, email: user.email, role: 'user', balance: 0 };
    next();
};

module.exports = authMiddleware;
