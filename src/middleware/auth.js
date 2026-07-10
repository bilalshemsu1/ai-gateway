/**
 * Basic Auth Middleware
 * 
 * Checks for API token in Authorization header
 * Usage: Authorization: Bearer <your-token>
 */

function auth(request, reply) {
    const authHeader = request.headers.authorization;
    
    console.log('[Auth] Header received:', authHeader ? 'YES' : 'NO');
    
    // Check if header exists
    if (!authHeader) {
        console.log('[Auth] No header - returning 401');
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Missing Authorization header'
        });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.replace('Bearer ', '');
    console.log('[Auth] Token:', token);
    console.log('[Auth] Expected:', process.env.API_SECRET);

    // Check if token matches
    if (token !== process.env.API_SECRET) {
        console.log('[Auth] Token mismatch - returning 401');
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid token'
        });
    }

    console.log('[Auth] Token valid - continuing');
    // Token valid — continue to route
}

export { auth };
