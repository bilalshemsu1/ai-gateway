/**
 * zydit Provider
 * 
 * zydit provides access to many AI models through one API
 * Docs: https://docs.zydit.in/
 */

import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

export class ZyditProvider extends BaseProvider {
    constructor(model) {
        super('Zydit');
        this.model = model || 'kimi-k2.5';
        this.apiKey = process.env.ZYDIT_API_KEY;
        this.baseUrl = 'https://api.zydit.in/v4';
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
                    'X-Title': 'Zydit'
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
