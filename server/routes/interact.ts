import {Router, type Request, type Response} from 'express';
import {
	JobController,
	getController,
	registerController,
} from '../generator.js';
import {getJob} from '../jobs.js';

const router: Router = Router();

router.post('/jobs/:id/cancel', (req: Request, res: Response) => {
	const job = getJob((req.params as {id: string}).id);
	if (!job) return res.status(404).json({error: 'Job not found'});

	if (job.status === 'rendering') {
		return res.status(400).json({
			error: '渲染中不支持中断；先等渲染完成',
		});
	}

	const controller = getController(job.id);
	if (!controller || !controller.isRunning()) {
		// Nothing to cancel; return current status.
		return res.json({ok: true, status: job.status});
	}
	controller.cancel();
	res.json({ok: true, status: 'cancelling'});
});

router.post('/jobs/:id/feedback', (req: Request, res: Response) => {
	const job = getJob((req.params as {id: string}).id);
	if (!job) return res.status(404).json({error: 'Job not found'});

	if (job.status === 'rendering') {
		return res.status(409).json({
			error: '渲染中不能反馈；先等渲染完成',
		});
	}

	const content =
		typeof (req.body as {content?: unknown})?.content === 'string'
			? ((req.body as {content: string}).content).trim()
			: '';
	if (!content) {
		return res.status(400).json({error: '缺少 content 字段'});
	}

	if (!job.modelId) {
		return res
			.status(400)
			.json({error: 'Job 没有 modelId，无法反馈（通常是旧任务的兼容问题）'});
	}

	let controller = getController(job.id);
	if (!controller) {
		// Rebuild controller (e.g., after server restart in future when we
		// persist jobs; today this mainly catches the edge case where the
		// controller was disposed but the job is still in memory).
		controller = new JobController(job.id, job.modelId);
		registerController(controller);
	}

	res.status(202).json({ok: true, turn: job.turn + 1});

	// Fire and forget — events stream tracks progress.
	controller.feedback(content).catch((err) => {
		// Swallow here; feedback() already emits error events / updates
		// job.status. We just don't want an unhandled rejection.
		console.error('[studio-chat] feedback error:', err);
	});
});

export default router;
