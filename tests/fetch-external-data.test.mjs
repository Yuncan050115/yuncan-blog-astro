// 降级路径的纯函数测试（node --test）：
// 单个源失败时保留旧数据或写空占位，build 继续；只有 --strict 才失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceOutcome } from '../scripts/fetch-external-data.mjs';

test('成功且有数据 → 写入，build 继续', () => {
  assert.deepEqual(sourceOutcome({ failed: false, payload: [{ appId: '1' }], hasOld: true, strict: true }),
    { action: 'write', failed: false, exitCode: 0 });
});

test('未配置（payload null）不算失败：保留旧数据或写空占位，--strict 也不失败', () => {
  assert.equal(sourceOutcome({ failed: false, payload: null, hasOld: true, strict: true }).exitCode, 0);
  assert.equal(sourceOutcome({ failed: false, payload: null, hasOld: false, strict: true }).action, 'placeholder');
});

test('抓到空数组不算失败：保留旧数据或写空占位', () => {
  assert.equal(sourceOutcome({ failed: false, payload: [], hasOld: true }).action, 'keep');
  assert.equal(sourceOutcome({ failed: false, payload: [], hasOld: false }).action, 'placeholder');
  assert.equal(sourceOutcome({ failed: false, payload: [], hasOld: false, strict: true }).exitCode, 0);
});

test('抓取失败 + 有旧数据 → 保留旧数据；--strict 下 build 失败', () => {
  const soft = sourceOutcome({ failed: true, payload: null, hasOld: true, strict: false });
  assert.deepEqual(soft, { action: 'keep', failed: true, exitCode: 0 });
  const hard = sourceOutcome({ failed: true, payload: null, hasOld: true, strict: true });
  assert.deepEqual(hard, { action: 'keep', failed: true, exitCode: 1 });
});

test('抓取失败 + 无旧数据 → 写空占位；--strict 下 build 失败', () => {
  const soft = sourceOutcome({ failed: true, payload: null, hasOld: false, strict: false });
  assert.deepEqual(soft, { action: 'placeholder', failed: true, exitCode: 0 });
  const hard = sourceOutcome({ failed: true, payload: null, hasOld: false, strict: true });
  assert.deepEqual(hard, { action: 'placeholder', failed: true, exitCode: 1 });
});

test('对象形状（Bangumi）有数据 → 写入', () => {
  const payload = { want: [], watching: [{}], watched: [], lastUpdate: '2026-11-05' };
  assert.equal(sourceOutcome({ failed: false, payload, hasOld: true }).action, 'write');
});
