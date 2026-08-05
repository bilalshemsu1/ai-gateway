/**
 * API Routes for AI Chat (OpenAI-Compatible)
 * 
 * Endpoints:
 *   POST /v1/chat/completions - Send messages to AI (OpenAI format)
 *   GET  /v1/providers        - List available providers
 * 
 * Flow: Request -> Auth -> Validate -> Provider -> Response
 */

import { rateLimit } from '../middleware/rateLimiter.js';
import { auth } from '../middleware/auth.js';

// Request timeout for provider calls (ms)
const PROVIDER_TIMEOUT = 30000;

export default async function askRoutes(fastify, options) {

    /**
     * POST /v1/chat/completions
     * 
     * OpenAI-compatible chat endpoint.
     * 
     * Request body:
     *   {
     *     "model": "auto" | "gpt-3.5-turbo" | "llama-3.1-8b-instant" | ...,
     *     "messages": [
     *       { "role": "user", "content": "Hello" }
     *     ]
     *   }
     * 
     * Response:
     *   {
     *     "id": "chatcmpl-abc123",
     *     "object": "chat.completion",
     *     "created": 1234567890,
     *     "model": "llama-3.1-8b-instant",
     *     "choices": [{
     *       "index": 0,
     *       "message": { "role": "assistant", "content": "Hi there!" },
     *       "finish_reason": "stop"
     *     }],
     *     "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 },
     *     "provider": "Groq",
     *     "response_time": 450
     *   }
     */
    fastify.post('/v1/chat/completions', { preHandler: auth }, async (request, reply) => {
        
        const { model, messages } = request.body;

        // ========================================
        // STEP 1: VALIDATE INPUT (OpenAI format)
        // ========================================
        
        // Validate messages array
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return reply.status(400).send({
                error: {
                    message: 'Invalid request: "messages" must be a non-empty array',
                    type: 'invalid_request_error',
                    code: 'invalid_messages'
                }
            });
        }

        // Validate each message has role and content
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                return reply.status(400).send({
                    error: {
                        message: 'Invalid request: each message must have "role" and "content"',
                        type: 'invalid_request_error',
                        code: 'invalid_message_format'
                    }
                });
            }
        }

        // Extract the last user message as prompt
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
            return reply.status(400).send({
                error: {
                    message: 'Invalid request: at least one user message required',
                    type: 'invalid_request_error',
                    code: 'no_user_message'
                }
            });
        }

        const prompt = lastUserMessage.content;

        // Validate prompt length
        if (prompt.length > 10000) {
            return reply.status(400).send({
                error: {
                    message: 'Invalid request: prompt too long (max 10000 characters)',
                    type: 'invalid_request_error',
                    code: 'prompt_too_long'
                }
            });
        }

        // ========================================
        // STEP 2: RATE LIMIT CHECK
        // ========================================
        
        const ip = request.ip;
        const limitResult = rateLimit(ip);

        if (!limitResult.allowed) {
            return reply.status(429).send({
                error: {
                    message: `Rate limit exceeded. Try again in ${limitResult.retryAfter} seconds.`,
                    type: 'rate_limit_error',
                    code: 'rate_limit_exceeded'
                },
                retry_after: limitResult.retryAfter
            });
        }

        // ========================================
        // STEP 3: SELECT PROVIDER
        // ========================================
        
        const requestedModel = model || 'auto';
        const allProviders = fastify.providerManager.getAllProviders();

        if (allProviders.length === 0) {
            return reply.status(503).send({
                error: {
                    message: 'No AI providers available',
                    type: 'server_error',
                    code: 'no_providers'
                }
            });
        }

        // ========================================
        // STEP 4: CALL PROVIDER (with failover)
        // ========================================
        
        const providerManager = fastify.providerManager;

        for (const provider of allProviders) {
            try {
                const startTime = Date.now();
                
                // Call with timeout
                const result = await Promise.race([
                    provider.generate(prompt),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Provider timeout')), PROVIDER_TIMEOUT)
                    )
                ]);
                
                const responseTime = Date.now() - startTime;
                
                // Increment counter on success
                providerManager.incrementCount(provider.name);

                // ========================================
                // STEP 5: RETURN OPENAI-COMPATIBLE RESPONSE
                // ========================================
                
                return {
                    id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: result.model,
                    choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: result.output
                        },
                        finish_reason: 'stop'
                    }],
                    usage: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    },
                    // Custom fields for gateway info
                    provider: result.provider,
                    response_time: responseTime
                };

            } catch (error) {
                // Decrement counter on failure to rebalance load
                providerManager.decrementCount(provider.name);
                
                // Log error but continue to next provider
                console.log(`[Failover] ${provider.name} failed:`, error.message);
                continue;
            }
        }

        // ========================================
        // ALL PROVIDERS FAILED
        // ========================================
        
        return reply.status(500).send({
            error: {
                message: 'All AI providers failed',
                type: 'server_error',
                code: 'all_providers_failed',
                tried: allProviders.map(p => p.name)
            }
        });
    });

    /**
     * GET /v1/providers
     * 
     * List available providers and their status.
     * No authentication required.
     */
    fastify.get('/v1/providers', async (request, reply) => {
        return fastify.providerManager.getStatus();
    });

}
