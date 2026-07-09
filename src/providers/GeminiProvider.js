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
        this.model = model;
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
        const response = await axios.post(
            `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
            {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            output: response.data.candidates[0].content.parts[0].text,
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
            // Try to list models - if works, API is available
            await axios.get(
                `${this.baseUrl}/models?key=${this.apiKey}`
            );
            return true;
        } catch (error) {
            return false;
        }
    }
}
