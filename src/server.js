/**
 * AI Gateway - Main Server
 * 
 * Simple version: Request → Provider → Response
 * No queue, no workers yet. Just make it work.
 */

import 'dotenv/config';
import Fastify from 'fastify';
import askRoutes from './api/ask.js';
import { ProviderManager } from './providers/ProviderManager.js';

// Create Fastify server
const fastify = Fastify({ logger: true });

// ============================================
// INITIALIZE PROVIDERS
// ============================================

const providerManager = new ProviderManager();
providerManager.initialize();

// Make providerManager available to all routes
fastify.decorate('providerManager', providerManager);

// ============================================
// ROUTES
// ============================================

// Basic health check
fastify.get('/', async (request, reply) => {
    return { 
        name: 'AI Gateway',
        version: '0.1.0',
        status: 'running'
    };
});

// System health check - show provider status
fastify.get('/health', async (request, reply) => {
    return { 
        status: 'ok',
        providers: await providerManager.getStatus()
    };
});

// Register API routes
fastify.register(askRoutes);

// ============================================
// START SERVER
// ============================================

const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`\n AI Gateway running on port ${port}\n`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
