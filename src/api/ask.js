/**
 * API Routes for AI Chat
 * 
 * Simple version: Direct provider call, no queue
 * Flow: Request → Validate → Provider → Response
 */

export default async function askRoutes(fastify, options) {

    // POST /v1/chat - Send a prompt to AI
    fastify.post('/v1/chat', async (request, reply) => {
        const { prompt, model } = request.body;

        // ========================================
        // STEP 1: VALIDATE INPUT
        // ========================================
        
        // Check if prompt exists and is a string
        if (!prompt || typeof prompt !== 'string') {
            return reply.status(400).send({
                error: 'Missing or invalid "prompt" field'
            });
        }

        // Check prompt length
        if (prompt.length > 10000) {
            return reply.status(400).send({
                error: 'Prompt too long. Maximum 10000 characters.'
            });
        }

        // ========================================
        // STEP 2: GET PROVIDER
        // ========================================
        
        const provider = fastify.providerManager.getBestProvider(model);
        
        if (!provider) {
            return reply.status(503).send({
                error: 'No AI providers available'
            });
        }

        // ========================================
        // STEP 3: CALL AI PROVIDER
        // ========================================
        
        try {
            const startTime = Date.now();
            
            // Call the AI provider
            const result = await provider.generate(prompt);
            
            const responseTime = Date.now() - startTime;

            // ========================================
            // STEP 4: RETURN RESULT
            // ========================================
            
            return {
                answer: result.output,
                provider: result.provider,
                model: result.model,
                response_time: responseTime
            };

        } catch (error) {
            // Provider failed
            return reply.status(500).send({
                error: 'AI provider failed',
                message: error.message
            });
        }
    });

    // GET /v1/providers - List available providers
    fastify.get('/v1/providers', async (request, reply) => {
        return fastify.providerManager.getStatus();
    });

}
