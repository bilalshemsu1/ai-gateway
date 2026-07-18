/**
 * Nvidia Provider
 * 
 * Nvidia provides access to AI models through one API
 * Docs: https://docs.api.nvidia.com
 */

import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

export class NvidiaProvider extends BaseProvider {
    constructor(model) {
        super('Nvidia');
        this.model = model || 'thinkingmachines/inkling';
        this.apiKey = process.env.NVIDIA_API_KEY;
        this.baseUrl = 'https://integrate.api.nvidia.com/v1';
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
     * Check if Nvidia is available
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
