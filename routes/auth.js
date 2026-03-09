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
    let { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    // If the profile doesn't exist in our custom users table (e.g. freshly registered), create it now
    if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert([{ id: user.id, email: user.email, balance: 0, role: 'user' }])
            .select()
            .single();
        
        if (insertError) {
            console.error('Error creating user profile:', insertError);
        } else {
            profile = newProfile;
        }
    }
    
    req.user = profile || { id: user.id, email: user.email, role: 'user', balance: 0 };
    next();
};

module.exports = authMiddleware;
