const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createBoardScheduleService } = require('../src/boards/scheduleService');

test('an agenda requests synchronization only after its write completes', async () => {
  const board = { pumperCode: 'esp32s3-A00001#01', driveTimes: [{ time: '07:30:00', state: true }] };
  const { promise, resolve } = Promise.withResolvers();
  let requests = 0;
  const service = createBoardScheduleService({ update: () => promise }, () => { requests++; });

  const saving = service.update('board-id', board);
  assert.equal(requests, 0);
  resolve(board);
  assert.equal(await saving, board);
  assert.equal(requests, 1);
});

test('reads, rejected writes and absent schedules do not request synchronization', async () => {
  const failure = new Error('Write failed');
  let requests = 0;
  const service = createBoardScheduleService({
    findAll: async () => [],
    findOne: async () => null,
    update: async () => { throw failure; },
    deleteOne: async () => null,
    editDriveTimes: async (_id, edit) => edit({ driveTimes: [] }),
  }, () => { requests++; });

  assert.deepEqual(await service.findAll(), []);
  assert.equal(await service.findOne('board-id'), null);
  await assert.rejects(service.update('board-id', {}), error => error === failure);
  assert.equal(await service.deleteOne('board-id'), null);
  assert.equal(await service.editDriveTime('board-id', 0, '07:30:00'), false);
  assert.equal(requests, 0);
});

test('changing, replacing or clearing drive times queues once per saved agenda', async () => {
  const board = { driveTimes: [{ time: '07:00:00', state: true }, { time: '08:00:00', state: true }] };
  let requests = 0;
  const service = createBoardScheduleService({
    editDriveTimes: async (_id, edit) => edit(board),
  }, () => { requests++; });

  assert.equal(await service.editDriveTime('board-id', 0, '07:30:00'), true);
  assert.equal(await service.editDriveTimeState('board-id', 0, false), true);
  assert.equal(await service.deleteDriveTimeAtIndex('board-id', 1), true);
  assert.deepEqual(board.driveTimes, [{ time: '07:30:00', state: false }]);
  assert.equal(await service.replaceDriveTimes('board-id', [{ time: '09:00:00', state: true }]), true);
  assert.deepEqual(board.driveTimes, [{ time: '09:00:00', state: true }]);
  assert.equal(await service.deleteAllDriveTimes('board-id'), true);
  assert.deepEqual(board.driveTimes, []);
  assert.equal(requests, 5);
});
