/**
 * API Routes for AI Chat
 * 
 * Simple version: Direct provider call, no queue
 * Flow: Request → Validate → Provider → Response
 */
import { rateLimit } from '../middleware/rateLimiter.js';
import { auth } from '../middleware/auth.js';

export default async function askRoutes(fastify, options) {

    // POST /v1/chat - Send a prompt to AI
    fastify.post('/v1/chat', async (request, reply) => {
        console.log('[Handler] Request received');
        
        // ========================================
        // STEP 0: AUTH CHECK
        // ========================================
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Missing Authorization header' });
        }
        const token = authHeader.replace('Bearer ', '');
        if (token !== process.env.API_SECRET) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
        }
        console.log('[Auth] Token valid');
        
        const { prompt, model } = request.body;
        console.log('[Handler] Body parsed, prompt:', prompt);

        console.log('\n--- NEW REQUEST ---');
        console.log('Prompt:', prompt);
        console.log('Model:', model || 'auto');

        // ========================================
        // STEP 1: VALIDATE INPUT
        // ========================================
        
        if (!prompt || typeof prompt !== 'string') {
            console.log('ERROR: Invalid prompt');
            return reply.status(400).send({
                error: 'Missing or invalid "prompt" field'
            });
        }

        if (prompt.length > 10000) {
            console.log('ERROR: Prompt too long');
            return reply.status(400).send({
                error: 'Prompt too long. Maximum 10000 characters.'
            });
        }

        console.log('✓ Input valid');

        // ========================================
        // STEP 2: GET PROVIDER
        // ========================================
        
        const provider = fastify.providerManager.getBestProvider(model);
        const ip = request.ip
        const limitResult = rateLimit(ip)

        if (!limitResult.allowed) {
            console.log('ERROR: Rate limit exceeded for IP:', ip);
            return reply.status(429).send({
                error: 'Too many requests',
                retryAfter: limitResult.retryAfter,
                message: `Rate limit exceeded. Try again in ${limitResult.retryAfter} seconds.`
            });
        }
        

        console.log('✓ Provider selected:', provider.name);

        // ========================================
        // STEP 3: CALL AI PROVIDER (with failover)
        // ========================================
        
        // Get all providers sorted by least busy
        const allProviders = fastify.providerManager.getAllProviders();
        console.log('Available providers for failover:', allProviders.map(p => p.name).join(', '));

        // Try each provider until one works
        for (const currentProvider of allProviders) {
            try {
                const startTime = Date.now();
                
                console.log('Trying provider:', currentProvider.name);
                const result = await currentProvider.generate(prompt);
                
                const responseTime = Date.now() - startTime;
                console.log('✓ Provider responded in', responseTime, 'ms');

                // ========================================
                // STEP 4: RETURN RESULT
                // ========================================
                
                console.log('✓ Returning result');
                return {
                    answer: result.output,
                    provider: result.provider,
                    model: result.model,
                    response_time: responseTime
                };

            } catch (error) {
                // Log the error but don't return yet — try next provider
                console.log(`✗ ${currentProvider.name} failed:`, error.message);
                
                if (error.response) {
                    console.log('  HTTP Status:', error.response.status);
                }
                
                // Continue to next provider in the loop
                continue;
            }
        }

        // ========================================
        // ALL PROVIDERS FAILED
        // ========================================
        
        console.log('\n--- ALL PROVIDERS FAILED ---');
        return reply.status(500).send({
            error: 'All AI providers failed',
            tried: allProviders.map(p => p.name)
        });
    });

    // GET /v1/providers - List available providers
    fastify.get('/v1/providers', async (request, reply) => {
        return fastify.providerManager.getStatus();
    });

}
