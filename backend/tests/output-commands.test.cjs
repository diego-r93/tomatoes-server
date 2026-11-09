const assert = require('node:assert/strict');
const test = require('node:test');
const { createOutputCommands } = require('../src/mqtt/outputCommands');

const host = 'esp32s3-TEST01';
const pump = host + '#02';

function harness(device) {
    const published = [];
    const expectedPulses = [];
    const commands = createOutputCommands({
        recentDevice: async () => device,
        reportedGpios: value => Object.values(value?.ports ?? {}).map(port => port.gpio),
        publish: (topic, payload) => published.push([topic, JSON.parse(payload)]),
        publishWhileConnected: async (topic, payload) => published.push([topic, JSON.parse(payload)]),
        expectPulse: async code => expectedPulses.push(code),
    });
    return { commands, published, expectedPulses };
}

test('manual GPIO rejects invalid or unobserved outputs without publishing', async () => {
    const { commands, published } = harness({ ports: { [pump]: { gpio: 1 } } });
    await assert.rejects(commands.setOutput('bad/host', { 1: true }), { status: 400 });
    await assert.rejects(commands.setOutput(host, { 1: 'true' }), { status: 400 });
    await assert.rejects(commands.setOutput(host, { 2: true }), { status: 409 });
    assert.deepEqual(published, []);
});

test('only manual ON records an expected pump pulse', async () => {
    const { commands, published, expectedPulses } = harness({ ports: { [pump]: { gpio: 1 } } });
    await commands.setOutput(host, { 1: true });
    await commands.setOutput(host, { 1: false });
    assert.deepEqual(published, [[host + '/output', { 1: true }], [host + '/output', { 1: false }]]);
    assert.deepEqual(expectedPulses, [pump]);
});

test('bulk OFF requires a recent device and targets the reported outputs', async () => {
    const offline = harness(null);
    await assert.rejects(offline.commands.turnOffAll(host), { status: 409 });
    assert.deepEqual(offline.published, []);

    const online = harness({ ports: { [pump]: { gpio: 1 }, [host + '#04']: { gpio: 3 } } });
    assert.deepEqual(await online.commands.turnOffAll(host), [1, 3]);
    assert.deepEqual(online.published, [[host + '/output', { 1: false, 3: false }]]);
    assert.deepEqual(online.expectedPulses, []);
});
