export class BaseProvider {
    constructor(name, models = []) { 
        this.name = name;
        this.models = models;
    }

    async generate(prompt) {
        throw new Error(`${this.name} generate method must be implemented by subclasses`);
    }

    async checkAvailability() {
        throw new Error(`${this.name} checkAvailability method must be implemented by subclasses`);
    }

    getModels() {
        return this.models;
    }
}