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
        const response = await axios.post(
        `${this.baseUrl}/chat/completions`, 
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
            return false;
        }
    }
}