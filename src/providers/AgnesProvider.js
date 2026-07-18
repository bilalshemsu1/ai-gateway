/**
 * Agnes AI Provider
 * 
 * Agnes AI provides access to AI models through one API
 * Docs: https://apihub.agnes-ai.com
 */

import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

export class AgnesProvider extends BaseProvider {
    constructor(model) {
        super('Agnes');
        this.model = model || 'agnes-2.0-flash';
        this.apiKey = process.env.AGNES_API_KEY;
        this.baseUrl = 'https://apihub.agnes-ai.com/v1';
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
                    'Content-Type': 'application/json'
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
     * Check if Agnes is available
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
