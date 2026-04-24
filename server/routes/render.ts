import {Router} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {getJob, updateJob} from '../jobs.js';
import {renderComposition} from '../bundler.js';
import {OUT_DIR} from '../paths.js';

const router: Router = Router();

router.post('/jobs/:id/render', (req, res) => {
	const job = getJob(req.params.id);
	if (!job) return res.status(404).json({error: 'Job not found'});
	if (job.status === 'generating') {
		return res.status(400).json({error: '还在生成代码，请稍候'});
	}
	if (job.status === 'rendering') {
		return res.status(400).json({error: '已经在渲染中'});
	}
	if (job.status !== 'ready' && job.status !== 'rendered' && job.status !== 'error') {
		return res.status(400).json({error: `状态 ${job.status} 无法渲染`});
	}

	updateJob(job.id, {status: 'rendering', renderProgress: 0, error: undefined});
	res.status(202).json({ok: true});

	renderComposition({
		compositionId: job.id,
		jobId: job.id,
		onProgress: (progress) => {
			updateJob(job.id, {renderProgress: progress});
		},
	})
		.then((mp4Path) => {
			updateJob(job.id, {
				status: 'rendered',
				renderProgress: 1,
				mp4Path,
			});
		})
		.catch((err) => {
			updateJob(job.id, {
				status: 'error',
				error: (err as Error).message ?? String(err),
			});
		});
});

router.get('/jobs/:id/download', (req, res) => {
	const job = getJob(req.params.id);
	if (!job) return res.status(404).json({error: 'Job not found'});
	const mp4 = job.mp4Path ?? path.join(OUT_DIR, `${job.id}.mp4`);
	if (!fs.existsSync(mp4)) {
		return res.status(404).json({error: '还没有渲染好'});
	}
	res.download(mp4, `${job.id}.mp4`);
});

export default router;
