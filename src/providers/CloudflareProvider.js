/**
 * Cloudflare Workers AI provider using the OpenAI-compatible chat endpoint.
 */

import axios from 'axios';
import { BaseProvider } from './BaseProvider.js';

const DEFAULT_MODEL = '@cf/zai-org/glm-4.7-flash';

export class CloudflareProvider extends BaseProvider {
    constructor(model = DEFAULT_MODEL) {
        super('Cloudflare', [DEFAULT_MODEL]);
        this.model = model;
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai`;
    }

    async generate(prompt, requestedModel) {
        const response = await axios.post(
            `${this.baseUrl}/v1/chat/completions`,
            {
                model: requestedModel || this.model,
                messages: [{ role: 'user', content: prompt }]
            },
            {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const output = response.data?.choices?.[0]?.message?.content;
        if (typeof output !== 'string' || output.length === 0) {
            throw new Error('Cloudflare returned an empty response');
        }

        return {
            output,
            provider: this.name,
            model: response.data.model || requestedModel || this.model
        };
    }

    async checkAvailability() {
        try {
            await axios.get(`${this.baseUrl}/models/search`, {
                headers: { Authorization: `Bearer ${this.apiToken}` },
                timeout: 10000
            });
            return true;
        } catch {
            return false;
        }
    }
}
