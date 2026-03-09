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
        .maybeSingle();
    
    // If the profile doesn't exist in our custom users table, create it now
    if (!profile) {
        console.log(`Initial sync for: ${user.email}`);
        const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .upsert([{ 
                id: user.id, 
                email: user.email, 
                balance: 0, 
                role: (process.env.ADMIN_EMAIL === user.email) ? 'admin' : 'user' 
            }])
            .select()
            .single();
        
        if (!insertError) profile = newProfile;
    }

    // AUTO-PROMOTE: If email matches ADMIN_EMAIL env var, ensure they are admin
    if (profile && user.email === process.env.ADMIN_EMAIL && profile.role !== 'admin') {
        const { data: updatedProfile } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', user.id)
            .select()
            .single();
        if (updatedProfile) profile = updatedProfile;
    }
    
    req.user = profile || { id: user.id, email: user.email, role: 'user', balance: 0 };
    next();
};

module.exports = authMiddleware;
