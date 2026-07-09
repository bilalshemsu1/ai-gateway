/**
 * Gemini Provider
 * 
 * Connects to Google's Gemini AI API
 * 
 * API Documentation: https://ai.google.dev/docs
 */

import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

export class GeminiProvider extends BaseProvider {
    constructor(model) {
        super('Gemini');
        this.model = model || 'gemini-2.0-flash';
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    }

    /**
     * Generate AI response
     * 
     * @param {string} prompt - User's question/prompt
     * @returns {Object} Response with output, provider, model
     */
    async generate(prompt) {
        const url = `${this.baseUrl}/models/${this.model}:generateContent`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };
        const response = await axios.post(
            url,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                }
            }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No response text from Gemini');
        return {
            output: text,
            provider: this.name,
            model: this.model
        };
    }

    /**
     * Check if Gemini API is available
     * 
     * @returns {boolean} true if available, false otherwise
     */
    async checkAvailability() {
        try {
            await axios.get(
                `${this.baseUrl}/models?key=${this.apiKey}`
            );
            return true;
        } catch (error) {
            console.log('[Gemini] Availability check failed:', error.message);
            return false;
        }
    }
}
