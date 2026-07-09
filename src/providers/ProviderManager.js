/**
 * This file manages all AI providers (Gemini, OpenRouter, etc.)
 * 
 * Think of it like a restaurant manager:
 * - Has a list of all chefs (providers)
 * - Picks the least busy chef for each order
 * - Tracks how many orders each chef handled
 */

import { GeminiProvider } from './GeminiProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';
import { OpenCodeZenProvider } from './OpenCodeZenProvider.js';

export class ProviderManager {
    constructor() {
        // List of all available providers
        // Example: { "Gemini": geminiProvider, "OpenRouter": openRouterProvider }
        this.providers = {};

        // Track how many requests each provider handled
        // Example: { "Gemini": 5, "OpenRouter": 2 }
        this.requestCount = {};
    }

    /**
     * Add a provider to our list
     * 
     * Example:
     * register(geminiProvider)
     * → this.providers["Gemini"] = geminiProvider
     * → this.requestCount["Gemini"] = 0
     */
    register(provider) {
        this.providers[provider.name] = provider;
        this.requestCount[provider.name] = 0;
        console.log(`[ProviderManager] Registered: ${provider.name}`);
    }

    /**
     * Get the provider with fewest requests (least busy)
     * 
     * Example:
     * - Gemini handled 5 requests
     * - OpenRouter handled 2 requests
     * → Return OpenRouter (least busy)
     */
    getBestProvider(requestedModel) {
        // Get all provider names
        const providerNames = Object.keys(this.providers);

        // No providers? Return null
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

        // Increase count for selected provider
        this.requestCount[bestName]++;

        console.log(`[ProviderManager] Selected: ${bestName} (${lowestCount} previous requests)`);

        // Return the provider object
        return this.providers[bestName];
    }

    /**
     * Get all providers sorted by least busy (for failover)
     * 
     * Returns array like: [openCodeZen, gemini, openRouter]
     * (sorted by fewest requests first)
     */
    getAllProviders() {
        const providerNames = Object.keys(this.providers);
        
        // Sort by request count (least busy first)
        providerNames.sort((a, b) => {
            return this.requestCount[a] - this.requestCount[b];
        });

        // Return provider objects in order
        return providerNames.map(name => this.providers[name]);
    }

    /**
     * Get status of all providers
     * 
     * Returns:
     * {
     *   "Gemini": { requests: 5, available: true },
     *   "OpenRouter": { requests: 2, available: false }
     * }
     */
    async getStatus() {
        const status = {};

        for (const name of Object.keys(this.providers)) {
            const provider = this.providers[name];
            
            // Check if provider is working
            let available = false;

            try {
                available = await provider.checkAvailability();
            } catch (error) {
                available = false;
            }

            status[name] = {
                requests: this.requestCount[name],
                available: available
            };
        }

        return status;
    }

    /**
     * Setup all providers at startup
     * 
     * Only registers providers that have API keys in .env file
     */
    initialize() {
        // Check if Gemini API key exists
        if (process.env.GEMINI_API_KEY) {
            this.register(new GeminiProvider());
        } else {
            console.log('[ProviderManager] Skipping Gemini (no API key)');
        }

        // Check if OpenRouter API key exists
        if (process.env.OPENROUTER_API_KEY) {
            this.register(new OpenRouterProvider());
        } else {
            console.log('[ProviderManager] Skipping OpenRouter (no API key)');
        }

        // Check if OpenCode Zen API key exists
        if (process.env.OPENCODE_API_KEY) {
            this.register(new OpenCodeZenProvider('north-mini-code-free'));
        } else {
            console.log('[ProviderManager] Skipping OpenCode Zen (no API key)');
        }

        // Show how many providers were registered
        const count = Object.keys(this.providers).length;
        console.log(`[ProviderManager] Ready with ${count} provider(s)`);
    }
}
