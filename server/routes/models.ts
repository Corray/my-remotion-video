import {Router} from 'express';
import {
	getDefaultModelId,
	listAllModels,
	listAvailableModels,
} from '../providers/index.js';

const router: Router = Router();

router.get('/models', (_req, res) => {
	const available = listAvailableModels();
	const all = listAllModels();
	res.json({
		available,
		disabled: all
			.filter((m) => !available.some((a) => a.id === m.id))
			.map((m) => ({id: m.id, label: m.label, envKey: m.envKey})),
		defaultModelId: getDefaultModelId(),
	});
});

export default router;
