const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const file = require('node:path').resolve(__dirname, '../../src/swap/deployment.js');
const api = fs.existsSync(file) ? require(file) : {};
test('unreviewed deployments cannot fund even with a healthy heartbeat', () => {
  assert.equal(typeof api.assertDeploymentAccepted, 'function');
  assert.throws(() => api.assertDeploymentAccepted({provider: {address: 'provider'}, scope: {}}), /acceptance/);
});
