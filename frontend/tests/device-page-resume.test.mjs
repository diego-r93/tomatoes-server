import test from 'node:test';
import assert from 'node:assert/strict';
import { watchDevicePageResume } from '../src/composables/devicePageResume.mjs';
const { EventTarget, Event } = globalThis;

function fixture(refresh = () => Promise.resolve()) {
  const windowTarget = new EventTarget(), documentTarget = new EventTarget();
  windowTarget.navigator = { onLine: true }; documentTarget.hidden = false;
  let time = 100000, last = 1000, calls = 0, clock = 1000;
  const stop = watchDevicePageResume({windowTarget,documentTarget,refresh:()=>{calls++;return refresh();},
    onResume: timestamp => { clock = timestamp; }, lastRefresh:()=>last,now:()=>time});
  return {windowTarget,documentTarget,stop,get calls(){return calls;},get clock(){return clock;},
    time: value => {time=value;},last: value => {last=value;},
    fire: name => (name === 'visibilitychange' ? documentTarget : windowTarget).dispatchEvent(new Event(name))};
}
const settle = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };

test('hidden tab does not poll; visibility return catches up the clock and requests real discovery', async () => {
  const f=fixture(); f.documentTarget.hidden=true; f.fire('visibilitychange'); await settle();
  assert.equal(f.calls,0); assert.equal(f.clock,1000);
  f.documentTarget.hidden=false; f.fire('visibilitychange'); await settle();
  assert.equal(f.calls,1); assert.equal(f.clock,100000); f.stop();
});
test('focus, pageshow and visibility bursts share one request, even while it is pending', async () => {
  let release; const f=fixture(()=>new Promise(resolve=>{release=resolve;}));
  for(const name of ['focus','pageshow','visibilitychange']) f.fire(name);
  await settle(); assert.equal(f.calls,1);
  f.time(200000); f.fire('focus'); await settle(); assert.equal(f.calls,1);
  release(); await settle(); f.fire('pageshow'); await settle(); assert.equal(f.calls,2); f.stop();
});
test('fresh discovery avoids another request while still updating the local display clock', async () => {
  const f=fixture(); f.last(99000); f.fire('focus'); await settle();
  assert.equal(f.calls,0); assert.equal(f.clock,100000);
  f.time(105000); f.fire('focus'); await settle(); assert.equal(f.calls,1); f.stop();
});
test('network recovery retries a failed discovery and does not poll while offline', async () => {
  const f=fixture(()=>Promise.reject(new Error('Network unavailable')));
  f.windowTarget.navigator.onLine=false; f.fire('focus'); await settle(); assert.equal(f.calls,0);
  f.windowTarget.navigator.onLine=true; f.fire('online'); await settle(); assert.equal(f.calls,1);
  f.fire('focus'); await settle(); assert.equal(f.calls,1);
  f.time(106000); f.fire('online'); await settle(); assert.equal(f.calls,2); f.stop();
});
test('unmount removes all listeners and prevents queued work from starting', async () => {
  const f=fixture(); f.fire('focus'); f.stop(); await settle(); assert.equal(f.calls,0);
  f.time(200000); for(const name of ['focus','pageshow','online','visibilitychange']) f.fire(name);
  await settle(); assert.equal(f.calls,0);
});
