/**
 * Z.AI Provider
 * 
 * Z.AI provides access to many AI models through one API
 * Docs: https://docs.z.ai/
 */

import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

export class ZaiProvider extends BaseProvider {
    constructor(model) {
        super('Zai');
        this.model = model || 'glm-4.7-flash';
        this.apiKey = process.env.ZAI_API_KEY;
        this.baseUrl = 'https://api.z.ai/api/paas/v4';
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
