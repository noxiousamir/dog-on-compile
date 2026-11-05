import { test } from 'node:test';
import * as assert from 'node:assert';
import { isCompile } from './match';

const p = 'build|compile|tsc|g\\+\\+|cargo';

test('matches compile commands', () => {
  for (const c of ['npm run build', 'tsc -p .', 'g++ main.cpp', 'cargo run', 'Compile Project']) assert.ok(isCompile(c, p), c);
});

test('ignores others and bad regex', () => {
  assert.ok(!isCompile('git status', p));
  assert.ok(!isCompile('npm run build', '(['));
});
