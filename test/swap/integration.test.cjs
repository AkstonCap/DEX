const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
test('swap UI freezes Nexus finality and offers receipt observation without a pasted payout id', () => {
  const code = fs.readFileSync(require('node:path').resolve(__dirname, '../../src/App/stablecoinSwap.js'), 'utf8');
  assert.match(code, /nexusMinConfirmations\s*:\s*6/);
  assert.match(code, /Check receipt \/ payout/);
  assert.match(code, /controller\.complete\(job\.id\s*,\s*null\)/);
  assert.match(code, /Receive.*notifications|notifications.*Receive/s);
  assert.match(code, /controller\.importNexusDebit\(job\.id/);
  assert.match(code, /controller\.attachSource\(job\.id[^)]*sourceContract/s);
  assert.match(code, /controller\.recoverMapping\(job\.id/);
  assert.match(code, /storageReason\(\)/);
});

test('cross-chain swap has a live navigation button and mounted component branch', () => {
  const code = fs.readFileSync(require('node:path').resolve(__dirname, '../../src/App/Main.js'), 'utf8');
  const tree = parser.parse(code, {sourceType: 'module', plugins: ['jsx']});
  let route = 0, label = 0;
  traverse(tree, {
    JSXOpeningElement(p) { if (p.node.name.name === 'StablecoinSwap') { route++; } },
    JSXText(p) { if (p.node.value.includes('Cross-chain swaps')) { label++; } },
  });
  assert.equal(route, 1, 'The replacement swap page must be rendered, not merely imported');
  assert.equal(label, 1);
});
