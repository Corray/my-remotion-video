import {afterEach, describe, expect, it} from 'vitest';
import {
	__resetJobsForTest,
	appendEvent,
	getJob,
	saveJob,
} from './jobs.js';
import {EVENT_RING_CAP} from './types.js';
import type {Job, StudioEvent} from './types.js';

function mkJob(id = 'gen-1'): Job {
	const now = Date.now();
	return {
		id,
		status: 'generating',
		scene: 'test scene',
		assets: [],
		conversation: [{role: 'user', content: 'hi', ts: now}],
		events: [],
		eventsTotalCount: 0,
		turn: 0,
		createdAt: now,
		updatedAt: now,
	};
}

function mkEvent(i: number): StudioEvent {
	return {type: 'token', delta: `t${i}`, turn: 0, ts: i};
}

describe('jobs.appendEvent', () => {
	afterEach(() => {
		__resetJobsForTest();
	});

	it('returns undefined for unknown job', () => {
		const result = appendEvent('missing', mkEvent(1));
		expect(result).toBeUndefined();
	});

	it('appends events in order', () => {
		saveJob(mkJob('j1'));
		appendEvent('j1', mkEvent(1));
		appendEvent('j1', mkEvent(2));
		appendEvent('j1', mkEvent(3));
		const job = getJob('j1')!;
		expect(job.events).toHaveLength(3);
		expect(job.events.map((e) => 'delta' in e && e.delta)).toEqual([
			't1',
			't2',
			't3',
		]);
	});

	it('bounds the buffer at EVENT_RING_CAP and drops oldest', () => {
		saveJob(mkJob('j2'));
		for (let i = 0; i < EVENT_RING_CAP + 10; i++) {
			appendEvent('j2', mkEvent(i));
		}
		const job = getJob('j2')!;
		expect(job.events).toHaveLength(EVENT_RING_CAP);
		// Oldest 10 should have been dropped, so first event is the 10th (delta "t10").
		const first = job.events[0];
		expect(first.type).toBe('token');
		if (first.type === 'token') expect(first.delta).toBe('t10');
		const last = job.events[job.events.length - 1];
		if (last.type === 'token')
			expect(last.delta).toBe(`t${EVENT_RING_CAP + 9}`);
	});

	it('updates updatedAt on each append', async () => {
		saveJob(mkJob('j3'));
		const before = getJob('j3')!.updatedAt;
		await new Promise((r) => setTimeout(r, 5));
		appendEvent('j3', mkEvent(1));
		const after = getJob('j3')!.updatedAt;
		expect(after).toBeGreaterThan(before);
	});
});
