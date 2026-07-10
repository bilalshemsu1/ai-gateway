/**
 * Groq Provider
 * 
 * Groq provides access to many AI models through one API
 * Docs: https://docs.Groq.ai/
 */

import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

export class GroqProvider extends BaseProvider {
    constructor(model) {
        super('Groq');
        this.model = model || 'llama-3.1-8b-instant';
        this.apiKey = process.env.GROQ_API_KEY;
        this.baseUrl = 'https://api.groq.com/openai/v1';
    }

    /**
     * Generate AI response
     */
    async generate(prompt) {
        const response = await axios.post(
            `${this.baseUrl}/chat/completions`,
            {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://ai-gateway.com',
                    'X-Title': 'AI Gateway'
                }
            }
        );

        return {
            output: response.data.choices[0].message.content,
            provider: this.name,
            model: this.model
        };
    }

    /**
     * Check if OpenRouter is available
     */
    async checkAvailability() {
        try {
            await axios.get(`${this.baseUrl}/models`, {
                headers: { Authorization: `Bearer ${this.apiKey}` }
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}
