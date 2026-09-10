import test from 'node:test';
import assert from 'node:assert/strict';
import {canAdvanceDemo,demoStages} from './demo-order-domain.js';
test('demo lifecycle requires sequential transitions',()=>{for(let i=0;i<demoStages.length-1;i++)assert.equal(canAdvanceDemo(demoStages[i]!,demoStages[i+1]!),true);assert.equal(canAdvanceDemo('submitted','settled'),false);});
test('terminal and unknown states cannot be reopened or refunded twice',()=>{for(const status of ['settled','cancelled','unknown'])for(const next of [...demoStages,'cancelled'])assert.equal(canAdvanceDemo(status,next),false);});
test('unsettled demo orders can cancel without provider calls',()=>{for(const status of demoStages.slice(0,-1))assert.equal(canAdvanceDemo(status,'cancelled'),true);});
