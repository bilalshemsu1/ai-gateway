import {BaseProvider} from "./BaseProvider.js";
import axios from "axios";

export class OpenCodeZenProvider extends BaseProvider {
    constructor(model) {
        super("OpenCodeZen");
        this.model = model;
        this.apiKey = process.env.OPENCODE_API_KEY;
        this.baseUrl = "https://opencode.ai/zen/v1"
    }

    async generate(prompt) {
        const url = `${this.baseUrl}/chat/completions`;
        
        console.log('[OpenCodeZen] Calling:', url);
        console.log('[OpenCodeZen] Model:', this.model);
        console.log('[OpenCodeZen] API Key exists:', !!this.apiKey);

        const response = await axios.post(
            url, 
            {
                messages: [
                   {
                        role: "user", 
                        content: prompt
                    }
                ],
                model: this.model
            }, 
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
        
        console.log('[OpenCodeZen] Response status:', response.status);
        return {
            output: response.data.choices[0].message.content,
            provider: this.name,
            model: this.model
        };
    }

    async checkAvailability() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/models`, 
                {
                headers: {Authorization: `Bearer ${this.apiKey}`}   
            });
            return true;
        } catch (error) {
            console.log('[OpenCodeZen] Availability check failed:', error.message);
            return false;
        }
    }
}
