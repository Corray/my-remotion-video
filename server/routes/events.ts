import {Router, type Response} from 'express';
import {getController} from '../generator.js';
import {getJob} from '../jobs.js';
import type {StudioEvent} from '../types.js';

const router: Router = Router();

function parseSince(req: {
	query: Record<string, unknown>;
	header: (name: string) => string | undefined;
}): number {
	const raw =
		(typeof req.query.since === 'string' && req.query.since) ||
		req.header('Last-Event-ID') ||
		'0';
	const n = parseInt(raw, 10);
	return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeEvent(res: Response, id: number, ev: StudioEvent): void {
	res.write(`id: ${id}\n`);
	res.write(`event: studio\n`);
	res.write(`data: ${JSON.stringify(ev)}\n\n`);
}

router.get('/jobs/:id/events', (req, res) => {
	const job = getJob(req.params.id);
	if (!job) return res.status(404).json({error: 'Job not found'});

	const since = parseSince({
		query: req.query as Record<string, unknown>,
		header: (name: string) => req.header(name) ?? undefined,
	});

	// Event index 0..eventsTotalCount-1; oldest in-buffer index is
	// eventsTotalCount - events.length. Anything older was evicted.
	const firstAvailable = job.eventsTotalCount - job.events.length;
	if (since < firstAvailable) {
		return res.status(410).json({
			error: `事件 ${since} 已被缓冲弹出`,
			firstAvailable,
		});
	}

	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	});

	// Replay buffered events starting from `since`.
	for (let i = since; i < job.events.length; i++) {
		writeEvent(res, i, job.events[i]);
	}

	// Live subscription (only if job is still active).
	const controller = getController(job.id);

	if (!controller || !controller.isRunning()) {
		// Job already terminal — no more events to stream. Close the stream.
		res.end();
		return;
	}

	const unsubscribe = controller.subscribe((ev) => {
		const freshJob = getJob(job.id);
		const idx = freshJob ? freshJob.events.length - 1 : 0;
		writeEvent(res, idx, ev);
	});

	// Heartbeat every 15s to keep intermediaries from buffering.
	const hb = setInterval(() => res.write(':heartbeat\n\n'), 15_000);

	req.on('close', () => {
		clearInterval(hb);
		unsubscribe();
	});
});

export default router;
