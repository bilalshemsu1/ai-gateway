/**
 * Auth Middleware - Token-based authentication
 * 
 * Validates Bearer token from Authorization header against API_SECRET env var.
 * Usage: Authorization: Bearer <your-token>
 * 
 * SECURITY: Never log token values in production.
 */

function auth(request, reply) {
    const authHeader = request.headers.authorization;
    
    // Check if header exists
    if (!authHeader) {
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Missing Authorization header'
        });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.replace('Bearer ', '');

    // Check if token matches (constant-time comparison would be even better)
    if (token !== process.env.API_SECRET) {
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid token'
        });
    }

    // Token valid — continue to route
}

export { auth };
