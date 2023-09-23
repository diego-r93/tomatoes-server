import fs from 'fs/promises';
import { CONFIG_PATHS } from '../config/networkConfig';

export class Network {
    private type: keyof typeof CONFIG_PATHS;

    constructor(type: keyof typeof CONFIG_PATHS) {
        this.type = type;
    }

    public async getConfig(): Promise<string> {
        try {
            return await fs.readFile(CONFIG_PATHS[this.type], 'utf8');
        } catch (error) {
            throw new Error('Failed to read the config');
        }
    }

    public async updateConfig(data: string): Promise<void> {
        try {
            await fs.writeFile(CONFIG_PATHS[this.type], data, 'utf8');
        } catch (error) {
            throw new Error('Failed to update the config');
        }
    }
}
