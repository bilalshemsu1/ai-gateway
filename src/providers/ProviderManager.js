/**
 * ProviderManager - Manages all AI providers
 * 
 * Responsibilities:
 *   - Register/unregister providers
 *   - Select least-busy provider for load balancing
 *   - Provide failover order (least busy first)
 *   - Track provider availability with caching
 * 
 * Load Balancing:
 *   Uses request count to pick least busy provider.
 *   Counter is incremented AFTER successful provider call,
 *   not during selection, to avoid skewing on failures.
 */

import { GeminiProvider } from './GeminiProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';
import { OpenCodeZenProvider } from './OpenCodeZenProvider.js';
import { MistralProvider } from './MistralProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { ZyditProvider } from './ZyditProvider.js';
import { ZaiProvider } from './ZaiProvider.js';
import { AgnesProvider } from './AgnesProvider.js';
import { NvidiaProvider } from './NvidiaProvider.js';

// Cache availability for 5 minutes to avoid spamming provider APIs
const AVAILABILITY_CACHE_TTL = 5 * 60 * 1000;

export class ProviderManager {
    constructor() {
        // Provider instances keyed by name
        this.providers = {};

        // Request count per provider for load balancing
        this.requestCount = {};

        // Cached availability status
        this.availabilityCache = {};
    }

    /**
     * Register a provider instance
     * 
     * @param {BaseProvider} provider - Provider to register
     */
    register(provider) {
        this.providers[provider.name] = provider;
        this.requestCount[provider.name] = 0;
        this.availabilityCache[provider.name] = { available: null, lastCheck: 0 };
        console.log(`[ProviderManager] Registered: ${provider.name}`);
    }

    /**
     * Increment request count for a provider (call after successful request)
     * 
     * @param {string} name - Provider name
     */
    incrementCount(name) {
        if (this.requestCount[name] !== undefined) {
            this.requestCount[name]++;
        }
    }

    /**
     * Decrement request count for a provider (call on failure to rebalance)
     * 
     * @param {string} name - Provider name
     */
    decrementCount(name) {
        if (this.requestCount[name] !== undefined && this.requestCount[name] > 0) {
            this.requestCount[name]--;
        }
    }

    /**
     * Get provider with fewest requests (least busy)
     * 
     * NOTE: Does NOT increment counter. Caller must call
     * incrementCount() on success or decrementCount() on failure.
     * 
     * @param {string} requestedModel - Model name or "auto"
     * @returns {BaseProvider|null} Selected provider or null
     */
    getBestProvider(requestedModel) {
        const providerNames = Object.keys(this.providers);

        if (providerNames.length === 0) {
            return null;
        }

        // Find provider with lowest request count
        let bestName = providerNames[0];
        let lowestCount = this.requestCount[bestName];

        for (const name of providerNames) {
            const count = this.requestCount[name];
            if (count < lowestCount) {
                lowestCount = count;
                bestName = name;
            }
        }

        return this.providers[bestName];
    }

    /**
     * Get all providers sorted by least busy (for failover)
     * 
     * @returns {BaseProvider[]} Array of providers sorted by request count
     */
    getAllProviders() {
        const providerNames = Object.keys(this.providers);
        
        // Sort by request count (least busy first)
        providerNames.sort((a, b) => {
            return this.requestCount[a] - this.requestCount[b];
        });

        return providerNames.map(name => this.providers[name]);
    }

    /**
     * Get availability status of all providers
     * 
     * Uses caching to avoid making API calls on every health check.
     * Cache TTL: 5 minutes.
     * 
     * @returns {Object} Status map { "ProviderName": { requests, available } }
     */
    async getStatus() {
        const status = {};
        const now = Date.now();

        for (const name of Object.keys(this.providers)) {
            const provider = this.providers[name];
            const cached = this.availabilityCache[name];

            let available;

            // Use cached value if still valid
            if (cached && (now - cached.lastCheck) < AVAILABILITY_CACHE_TTL && cached.available !== null) {
                available = cached.available;
            } else {
                // Fresh check
                try {
                    available = await provider.checkAvailability();
                } catch (error) {
                    available = false;
                }
                
                // Update cache
                this.availabilityCache[name] = { available, lastCheck: now };
            }

            status[name] = {
                requests: this.requestCount[name],
                available: available
            };
        }

        return status;
    }

    /**
     * Initialize providers based on available API keys in environment
     * 
     * Only registers providers that have their API key configured.
     */
    initialize() {
        const providerConfigs = [
            { envKey: 'GEMINI_API_KEY', Provider: GeminiProvider },
            { envKey: 'OPENROUTER_API_KEY', Provider: OpenRouterProvider },
            { envKey: 'MISTRAL_API_KEY', Provider: MistralProvider },
            { envKey: 'GROQ_API_KEY', Provider: GroqProvider },
            { envKey: 'ZYDIT_API_KEY', Provider: ZyditProvider },
            { envKey: 'OPENCODE_API_KEY', Provider: OpenCodeZenProvider, model: 'north-mini-code-free' },
            { envKey: 'ZAI_API_KEY', Provider: ZaiProvider },
            { envKey: 'AGNES_API_KEY', Provider: AgnesProvider },
            { envKey: 'NVIDIA_API_KEY', Provider: NvidiaProvider },
        ];

        for (const config of providerConfigs) {
            if (process.env[config.envKey]) {
                const provider = config.model 
                    ? new config.Provider(config.model)
                    : new config.Provider();
                this.register(provider);
            } else {
                console.log(`[ProviderManager] Skipping ${config.Provider.name} (no API key)`);
            }
        }

        const count = Object.keys(this.providers).length;
        console.log(`[ProviderManager] Ready with ${count} provider(s)`);
    }
}
