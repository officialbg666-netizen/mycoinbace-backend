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
    let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // maybeSingle is safer for checking existence
    
    // If the profile doesn't exist in our custom users table (e.g. freshly registered), create it now
    if (!profile) {
        console.log(`Creating missing profile for user: ${user.email}`);
        const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .upsert([{ 
                id: user.id, 
                email: user.email, 
                balance: 0, 
                role: 'user' 
            }], { onConflict: 'id' }) // Upsert handles race conditions better
            .select()
            .single();
        
        if (insertError) {
            console.error('CRITICAL: Failed to create user profile in custom users table:', insertError);
            return res.status(500).json({ 
                error: 'Database Sync Error', 
                details: 'Your user profile could not be initialized. Please contact support.',
                supabaseError: insertError.message
            });
        }
        profile = newProfile;
    }
    
    req.user = profile;
    next();
};

module.exports = authMiddleware;
