import { HttpError } from '../users/types';

interface CommandDevice {
    ports?: Record<string, { gpio?: unknown; state?: unknown }>;
}

interface OutputCommandDependencies {
    recentDevice(host: string): Promise<CommandDevice | null>;
    reportedGpios(device: CommandDevice | null): number[];
    publish(topic: string, message: string): void;
    publishWhileConnected(topic: string, message: string): Promise<void>;
    expectPulse(code: string, time: number): Promise<unknown>;
}

const validHost = /^[a-zA-Z0-9._-]{1,128}$/;

export function createOutputCommands(deps: OutputCommandDependencies) {
    return {
        async setOutput(host: string, input: unknown): Promise<void> {
            const values = input && typeof input === 'object' && !Array.isArray(input) ? Object.entries(input) : [];
            if (!validHost.test(host) || values.length !== 1 || !/^\d{1,3}$/.test(values[0][0]) || Number(values[0][0]) > 255 || typeof values[0][1] !== 'boolean') {
                throw new HttpError(400, 'Select one device output and a boolean state.');
            }
            const [gpio, state] = values[0];
            const device = await deps.recentDevice(host);
            if (!device || !Object.values(device.ports || {}).some(port => port?.gpio != null && port.gpio !== '' && Number(port.gpio) === Number(gpio))) {
                throw new HttpError(409, 'The device or output has not been confirmed by discovery.');
            }

            deps.publish(host + '/output', JSON.stringify({ [Number(gpio)]: state }));
            if (state === true) {
                const code = Object.entries(device.ports || {}).find(([, port]) => Number(port?.gpio) === Number(gpio))?.[0];
                if (code) await deps.expectPulse(code, Date.now());
            }
        },

        async turnOffAll(host: string): Promise<number[]> {
            if (!validHost.test(host)) throw new HttpError(400, 'Select a valid device.');
            const device = await deps.recentDevice(host);
            const gpios = deps.reportedGpios(device);
            if (!gpios.length) throw new HttpError(409, 'The device has no recently reported outputs.');

            const command = Object.fromEntries(gpios.map(gpio => [gpio, false]));
            await deps.publishWhileConnected(host + '/output', JSON.stringify(command));
            return gpios;
        },
    };
}
