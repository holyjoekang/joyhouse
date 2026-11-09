import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirect } from '../src/core/direct.js';
const waitKey = async client => {
  for (let i = 0; i < 100 && !client.publicKey; i++) await new Promise(r => setTimeout(r, 5));
  assert.ok(client.publicKey);
};
test('private message: recipient decrypts; tampering, replay and other recipients are rejected', async () => {
  let packet; const received = [], other = [];
  const alice = createDirect('alice', async (_, p) => { packet = p; }, () => {});
  const bob = createDirect('bob', async () => {}, m => received.push(m));
  const eve = createDirect('eve', async () => {}, m => other.push(m));
  await Promise.all([alice,bob,eve].map(waitKey));
  alice.remember('bob', bob.publicKey); bob.remember('alice', alice.publicKey); eve.remember('alice', alice.publicKey);
  await alice.send('bob','안녕하세요, 둘만의 대화');
  assert.ok(!JSON.stringify(packet).includes('둘만의 대화'));
  await eve.accept(packet); assert.equal(other.length,0);
  await bob.accept({...packet,mid:'tampered'}); assert.equal(received.length,0);
  await bob.accept(packet); assert.equal(received[0].text,'안녕하세요, 둘만의 대화');
  await bob.accept(packet); assert.equal(received.length,1);
});
test('unknown recipients, oversized input and disconnected transport fail visibly', async () => {
  const a = createDirect('a', async () => { throw Error('offline'); }, () => {});
  const b = createDirect('b', async () => {}, () => {});
  await Promise.all([a,b].map(waitKey));
  await assert.rejects(a.send('unknown','hello'));
  a.remember('b',b.publicKey);
  await assert.rejects(a.send('b','x'.repeat(501)));
  await assert.rejects(a.send('b','hello'),/offline/);
});
