import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import {OUT_DIR, PUBLIC_ASSETS_DIR} from './paths.js';
import jobsRouter from './routes/jobs.js';
import renderRouter from './routes/render.js';
import modelsRouter from './routes/models.js';
import eventsRouter from './routes/events.js';
import interactRouter from './routes/interact.js';
import {listAvailableModels} from './providers/index.js';
import {rewriteGeneratedIndex} from './registry.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
	await fs.mkdir(PUBLIC_ASSETS_DIR, {recursive: true});
	await fs.mkdir(OUT_DIR, {recursive: true});
	await rewriteGeneratedIndex();

	const app = express();
	app.use(cors());
	app.use(express.json({limit: '2mb'}));

	app.get('/api/health', (_req, res) => {
		const available = listAvailableModels();
		res.json({
			ok: true,
			availableModelCount: available.length,
			availableModels: available.map((m) => m.id),
		});
	});

	app.use('/api', jobsRouter);
	app.use('/api', renderRouter);
	app.use('/api', modelsRouter);
	app.use('/api', eventsRouter);
	app.use('/api', interactRouter);

	app.listen(PORT, () => {
		console.log(`[studio-server] listening on http://localhost:${PORT}`);
		const available = listAvailableModels();
		if (available.length === 0) {
			console.warn(
				'[studio-server] ⚠️  没有检测到任何 API key。请在 .env 里配置 ANTHROPIC_API_KEY / OPENAI_API_KEY / MINIMAX_API_KEY / DEEPSEEK_API_KEY（至少一个）。',
			);
		} else {
			console.log(
				`[studio-server] 可用模型 (${available.length}): ${available.map((m) => m.id).join(', ')}`,
			);
		}
	});
}

main().catch((err) => {
	console.error('[studio-server] fatal:', err);
	process.exit(1);
});
