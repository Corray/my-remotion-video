import express from 'express';
import request from 'supertest';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {__resetJobsForTest, appendEvent, saveJob} from '../jobs.js';
import {EVENT_RING_CAP} from '../types.js';
import type {Job, StudioEvent} from '../types.js';
import eventsRouter from './events.js';

function mkApp() {
	const app = express();
	app.use('/api', eventsRouter);
	return app;
}

function mkJob(id = 'j1', events: StudioEvent[] = []): Job {
	const now = Date.now();
	return {
		id,
		status: 'ready',
		scene: 's',
		assets: [],
		conversation: [],
		events,
		eventsTotalCount: events.length,
		turn: 0,
		createdAt: now,
		updatedAt: now,
	};
}

function mkEvent(i: number): StudioEvent {
	return {type: 'token', delta: `t${i}`, turn: 0, ts: i};
}

describe('GET /api/jobs/:id/events', () => {
	beforeEach(() => {
		__resetJobsForTest();
	});

	it('returns 404 for unknown job', async () => {
		const res = await request(mkApp()).get('/api/jobs/missing/events');
		expect(res.status).toBe(404);
	});

	it('replays buffered events and closes stream when no controller', async () => {
		saveJob(mkJob('j1'));
		appendEvent('j1', mkEvent(1));
		appendEvent('j1', mkEvent(2));
		appendEvent('j1', mkEvent(3));

		const res = await request(mkApp())
			.get('/api/jobs/j1/events')
			.buffer(true)
			.parse((r, cb) => {
				let data = '';
				r.setEncoding('utf8');
				r.on('data', (c: string) => {
					data += c;
				});
				r.on('end', () => cb(null, data));
			});

		expect(res.status).toBe(200);
		expect(res.headers['content-type']).toMatch(/text\/event-stream/);
		const body = res.body as unknown as string;
		// Expect 3 event frames
		const idMatches = body.match(/^id: (\d+)$/gm) ?? [];
		expect(idMatches).toHaveLength(3);
		expect(body).toContain('event: studio');
		expect(body).toContain('"type":"token"');
		expect(body).toContain('"delta":"t1"');
		expect(body).toContain('"delta":"t3"');
	});

	it('honors ?since to skip already-seen events', async () => {
		saveJob(mkJob('j2'));
		for (let i = 1; i <= 5; i++) appendEvent('j2', mkEvent(i));

		const res = await request(mkApp())
			.get('/api/jobs/j2/events?since=3')
			.buffer(true)
			.parse((r, cb) => {
				let data = '';
				r.setEncoding('utf8');
				r.on('data', (c: string) => {
					data += c;
				});
				r.on('end', () => cb(null, data));
			});

		const body = res.body as unknown as string;
		const idMatches = body.match(/^id: (\d+)$/gm) ?? [];
		// Events with index 3, 4 only (0-indexed: 3rd, 4th)
		expect(idMatches).toHaveLength(2);
		expect(body).toContain('"delta":"t4"');
		expect(body).toContain('"delta":"t5"');
	});

	it('honors Last-Event-ID header', async () => {
		saveJob(mkJob('j3'));
		for (let i = 1; i <= 4; i++) appendEvent('j3', mkEvent(i));

		const res = await request(mkApp())
			.get('/api/jobs/j3/events')
			.set('Last-Event-ID', '2')
			.buffer(true)
			.parse((r, cb) => {
				let data = '';
				r.setEncoding('utf8');
				r.on('data', (c: string) => {
					data += c;
				});
				r.on('end', () => cb(null, data));
			});

		const body = res.body as unknown as string;
		const idMatches = body.match(/^id: (\d+)$/gm) ?? [];
		expect(idMatches).toHaveLength(2);
	});

	it('returns 410 when since is below firstAvailable (ring evicted)', async () => {
		saveJob(mkJob('j4'));
		for (let i = 0; i < EVENT_RING_CAP + 10; i++) appendEvent('j4', mkEvent(i));

		const res = await request(mkApp()).get('/api/jobs/j4/events?since=0');
		expect(res.status).toBe(410);
		expect(res.body).toHaveProperty('firstAvailable');
	});
});
