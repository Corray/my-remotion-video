import {Router} from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {PUBLIC_ASSETS_DIR} from '../paths.js';
import {
	JobController,
	disposeController,
	registerController,
} from '../generator.js';
import {getDefaultModelId} from '../providers/index.js';
import {removeGeneratedComposition} from '../registry.js';
import {invalidateBundle} from '../bundler.js';
import {saveJob, getJob, listJobs} from '../jobs.js';
import type {AssetInfo, Job} from '../types.js';

const router: Router = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {fileSize: 50 * 1024 * 1024}, // 50MB per file
});

function newJobId(): string {
	// Remotion <Composition id> only allows a-z/A-Z/0-9/CJK/'-' — no underscores.
	const rand = randomBytes(4).toString('hex');
	return `gen-${Date.now()}-${rand}`;
}

function sanitizeFilename(name: string): string {
	// Strip directory components, keep alnum/dot/dash/underscore.
	const base = path.basename(name);
	return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function saveAssets(
	jobId: string,
	files: Express.Multer.File[],
): Promise<AssetInfo[]> {
	const dir = path.join(PUBLIC_ASSETS_DIR, jobId);
	await fs.mkdir(dir, {recursive: true});

	const out: AssetInfo[] = [];
	for (const f of files) {
		const safeName = sanitizeFilename(f.originalname);
		await fs.writeFile(path.join(dir, safeName), f.buffer);
		out.push({
			originalName: f.originalname,
			filename: safeName,
			staticPath: `generated/${jobId}/${safeName}`,
			mimeType: f.mimetype,
			sizeBytes: f.size,
		});
	}
	return out;
}

router.get('/jobs', (_req, res) => {
	res.json({jobs: listJobs()});
});

router.get('/jobs/:id', (req, res) => {
	const job = getJob(req.params.id);
	if (!job) return res.status(404).json({error: 'Job not found'});
	res.json({job});
});

router.post('/jobs', upload.array('assets', 20), async (req, res) => {
	const scene = typeof req.body.scene === 'string' ? req.body.scene.trim() : '';
	if (!scene) {
		return res.status(400).json({error: '缺少 scene 参数'});
	}
	const requestedModel =
		typeof req.body.modelId === 'string' && req.body.modelId
			? req.body.modelId
			: getDefaultModelId();
	if (!requestedModel) {
		return res
			.status(400)
			.json({error: '没有任何模型可用，请在 .env 里配置至少一个 API key'});
	}

	const jobId = newJobId();
	const now = Date.now();
	const files = (req.files as Express.Multer.File[] | undefined) ?? [];

	let assets: AssetInfo[] = [];
	try {
		assets = await saveAssets(jobId, files);
	} catch (err) {
		return res
			.status(500)
			.json({error: `素材保存失败: ${(err as Error).message}`});
	}

	const job: Job = {
		id: jobId,
		status: 'generating',
		scene,
		assets,
		modelId: requestedModel,
		conversation: [{role: 'user', content: scene, ts: now}],
		events: [],
		eventsTotalCount: 0,
		turn: 0,
		createdAt: now,
		updatedAt: now,
	};
	saveJob(job);

	// Respond immediately; controller emits events via SSE.
	res.status(202).json({job});

	const controller = new JobController(jobId, requestedModel);
	registerController(controller);
	controller.start(0);
});

router.delete('/jobs/:id', async (req, res) => {
	const job = getJob(req.params.id);
	if (!job) return res.status(404).json({error: 'Job not found'});
	await removeGeneratedComposition(req.params.id);
	invalidateBundle();
	disposeController(req.params.id);
	// Leave files in public/generated and out/ for now — easy to inspect.
	res.json({ok: true});
});

export default router;
