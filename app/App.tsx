import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {ChatInput} from './ChatInput.js';
import {TerminalPanel} from './TerminalPanel.js';
import {useJobEvents} from './useJobEvents.js';

type JobStatus =
	| 'generating'
	| 'ready'
	| 'rendering'
	| 'rendered'
	| 'cancelled'
	| 'error';

type AssetInfo = {
	originalName: string;
	filename: string;
	staticPath: string;
	mimeType: string;
	sizeBytes: number;
};

type CompMeta = {
	durationInFrames: number;
	fps: number;
	width: number;
	height: number;
};

type Job = {
	id: string;
	status: JobStatus;
	scene: string;
	assets: AssetInfo[];
	modelId?: string;
	attempts?: number;
	meta?: CompMeta;
	summary?: string;
	error?: string;
	renderProgress?: number;
	mp4Path?: string;
	createdAt: number;
	updatedAt: number;
};

type ModelEntry = {
	id: string;
	label: string;
	vendor: string;
	model: string;
	envKey: string;
};

type ModelsResponse = {
	available: ModelEntry[];
	disabled: {id: string; label: string; envKey: string}[];
	defaultModelId?: string;
};

declare const __PROJECT_ROOT__: string;

function statusLabel(s: JobStatus): string {
	return {
		generating: '生成中',
		ready: '已生成',
		rendering: '渲染中',
		rendered: '已渲染',
		cancelled: '已中断',
		error: '出错',
	}[s];
}

// Load a freshly-written composition directly from disk via Vite's /@fs/ endpoint.
// This sidesteps import.meta.glob's compile-time snapshot, so new files work
// without a page reload.
async function loadComposition(jobId: string): Promise<React.FC | null> {
	const url = `/@fs${__PROJECT_ROOT__}/src/generated/${jobId}.tsx?t=${Date.now()}`;
	const mod = (await import(/* @vite-ignore */ url)) as {
		Composition?: React.FC;
	};
	return mod.Composition ?? null;
}

function readActiveFromHash(): string | null {
	const hash = window.location.hash.replace(/^#/, '');
	return /^gen[-_]/.test(hash) ? hash : null;
}

export const App: React.FC = () => {
	const [scene, setScene] = useState('');
	const [files, setFiles] = useState<File[]>([]);
	const [jobs, setJobs] = useState<Job[]>([]);
	const [activeId, setActiveIdState] = useState<string | null>(
		readActiveFromHash(),
	);
	const setActiveId = useCallback((id: string | null) => {
		setActiveIdState(id);
		window.location.hash = id ?? '';
	}, []);
	const [submitting, setSubmitting] = useState(false);
	const [apiWarn, setApiWarn] = useState<string | null>(null);
	const [Component, setComponent] = useState<React.FC | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [models, setModels] = useState<ModelsResponse | null>(null);
	const [modelId, setModelId] = useState<string>('');
	const pollTimer = useRef<number | null>(null);

	const active = useMemo(
		() => jobs.find((j) => j.id === activeId) ?? null,
		[jobs, activeId],
	);

	// Subscribe to the active job's live event stream. Terminal states have
	// no more events incoming, but replay still gives us the history.
	const eventsEnabled =
		!!active &&
		active.status !== 'rendering' &&
		active.status !== 'rendered';
	const {events: liveEvents} = useJobEvents(activeId, {enabled: eventsEnabled});

	const refreshJobs = useCallback(async () => {
		const res = await fetch('/api/jobs');
		const data = await res.json();
		setJobs(data.jobs as Job[]);
	}, []);

	useEffect(() => {
		fetch('/api/models')
			.then((r) => r.json())
			.then((data: ModelsResponse) => {
				setModels(data);
				if (data.available.length === 0) {
					setApiWarn(
						'⚠️ 没有可用模型。请在项目根目录 .env 里配置至少一个 API key（Claude / OpenAI / MiniMax / DeepSeek），然后重启 studio。',
					);
				} else {
					setModelId(data.defaultModelId ?? data.available[0].id);
				}
			})
			.catch(() => {
				setApiWarn('⚠️ 连接后端失败（http://localhost:3001）');
			});
		refreshJobs();
	}, [refreshJobs]);

	// Poll jobs while any is in-flight.
	useEffect(() => {
		const hasInflight = jobs.some(
			(j) => j.status === 'generating' || j.status === 'rendering',
		);
		if (!hasInflight) {
			if (pollTimer.current) {
				window.clearInterval(pollTimer.current);
				pollTimer.current = null;
			}
			return;
		}
		if (pollTimer.current) return;
		pollTimer.current = window.setInterval(refreshJobs, 1000);
		return () => {
			if (pollTimer.current) {
				window.clearInterval(pollTimer.current);
				pollTimer.current = null;
			}
		};
	}, [jobs, refreshJobs]);

	// Load composition module whenever active job becomes ready.
	useEffect(() => {
		if (
			!active ||
			(active.status !== 'ready' &&
				active.status !== 'rendering' &&
				active.status !== 'rendered')
		) {
			setComponent(null);
			setLoadFailed(false);
			return;
		}
		let cancelled = false;
		loadComposition(active.id)
			.then((C) => {
				if (cancelled) return;
				if (C) {
					setComponent(() => C);
					setLoadFailed(false);
				} else {
					setLoadFailed(true);
					setComponent(null);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					console.error('loadComposition failed:', err);
					setComponent(null);
					setLoadFailed(true);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [active?.id, active?.status]);

	const submit = async () => {
		if (!scene.trim()) {
			alert('先写个场景描述');
			return;
		}
		setSubmitting(true);
		try {
			const form = new FormData();
			form.append('scene', scene);
			if (modelId) form.append('modelId', modelId);
			for (const f of files) form.append('assets', f);
			const res = await fetch('/api/jobs', {method: 'POST', body: form});
			const data = await res.json();
			if (!res.ok) {
				alert(`创建任务失败: ${data.error ?? res.status}`);
				return;
			}
			setActiveId(data.job.id);
			setScene('');
			setFiles([]);
			await refreshJobs();
		} finally {
			setSubmitting(false);
		}
	};

	const startRender = async () => {
		if (!active) return;
		const res = await fetch(`/api/jobs/${active.id}/render`, {method: 'POST'});
		if (!res.ok) {
			const d = await res.json().catch(() => ({}));
			alert(`启动渲染失败: ${d.error ?? res.status}`);
			return;
		}
		await refreshJobs();
	};

	const cancelActive = useCallback(async () => {
		if (!active) return;
		const res = await fetch(`/api/jobs/${active.id}/cancel`, {method: 'POST'});
		if (!res.ok) {
			const d = (await res.json().catch(() => ({}))) as {error?: string};
			alert(`中断失败: ${d.error ?? res.status}`);
			return;
		}
		await refreshJobs();
	}, [active, refreshJobs]);

	const sendFeedback = useCallback(
		async (content: string) => {
			if (!active) return;
			const res = await fetch(`/api/jobs/${active.id}/feedback`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({content}),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => ({}))) as {error?: string};
				alert(`发送反馈失败: ${d.error ?? res.status}`);
				return;
			}
			await refreshJobs();
		},
		[active, refreshJobs],
	);

	const fitSize = useMemo(() => {
		if (!active?.meta) return {width: 400, height: 711};
		const aspect = active.meta.width / active.meta.height;
		const maxH = 720;
		const maxW = 960;
		let h = maxH;
		let w = h * aspect;
		if (w > maxW) {
			w = maxW;
			h = w / aspect;
		}
		return {width: Math.round(w), height: Math.round(h)};
	}, [active?.meta]);

	return (
		<div className="app">
			<div className="panel">
				<h1>🎬 场景 → 视频</h1>
				{apiWarn && <div className="error-box">{apiWarn}</div>}

				<div>
					<h2>模型</h2>
					<select
						value={modelId}
						onChange={(e) => setModelId(e.target.value)}
						disabled={!models || models.available.length === 0}
					>
						{models?.available.map((m) => (
							<option key={m.id} value={m.id}>
								{m.label}
							</option>
						))}
						{!models?.available.length && (
							<option value="">（没有可用模型）</option>
						)}
					</select>
					{models && models.disabled.length > 0 && (
						<div className="muted" style={{marginTop: 4}}>
							未启用：
							{models.disabled
								.map((m) => `${m.label}（设 ${m.envKey}）`)
								.join('、')}
						</div>
					)}
				</div>

				<div>
					<h2>场景描述</h2>
					<textarea
						placeholder="例：一个穿红色连衣裙的小女孩在樱花树下转圈，飘落的花瓣慢慢堆成一个爱心。背景音乐轻快，总时长 10 秒。"
						value={scene}
						onChange={(e) => setScene(e.target.value)}
					/>
				</div>

				<div>
					<h2>素材（可选·图片/音频）</h2>
					<input
						type="file"
						multiple
						accept="image/*,audio/*"
						onChange={(e) =>
							setFiles(e.target.files ? Array.from(e.target.files) : [])
						}
					/>
					{files.length > 0 && (
						<div className="asset-list" style={{marginTop: 6}}>
							{files.map((f) => (
								<div key={f.name}>
									· {f.name} ({Math.round(f.size / 1024)} KB)
								</div>
							))}
						</div>
					)}
				</div>

				<div className="row">
					<button
						onClick={submit}
						disabled={submitting || !modelId || !models?.available.length}
					>
						{submitting ? '提交中…' : '生成'}
					</button>
					<span className="muted">生成通常 10-30 秒，失败会自动重试一次</span>
				</div>

				<div>
					<h2>历史</h2>
					<div className="history">
						{jobs.length === 0 && (
							<div className="muted">还没有任务。写个场景试试。</div>
						)}
						{jobs.map((j) => (
							<div
								key={j.id}
								className={`history-item ${j.id === activeId ? 'active' : ''}`}
								onClick={() => setActiveId(j.id)}
							>
								<div className="row" style={{justifyContent: 'space-between'}}>
									<span>{j.summary ?? j.scene.slice(0, 40)}</span>
									<span className={`status ${j.status}`}>
										{statusLabel(j.status)}
									</span>
								</div>
								<div className="muted" style={{marginTop: 4}}>
									{new Date(j.createdAt).toLocaleString()}
									{j.modelId && <> · {j.modelId.split('/')[0]}</>}
									{j.attempts && j.attempts > 1 && (
										<> · 重试 {j.attempts - 1} 次</>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="panel">
				<div className="row" style={{justifyContent: 'space-between'}}>
					<h1>预览 / 对话</h1>
					{active && (
						<span className={`status ${active.status}`}>
							{statusLabel(active.status)}
						</span>
					)}
				</div>

				{!active && (
					<div className="empty">
						从左边选一个任务，或写一个新场景点「生成」。
					</div>
				)}

				{active && (
					<>
						{active.status === 'error' && (
							<div className="error-box">
								{active.error ?? '未知错误'}
							</div>
						)}

						{Component && active.meta && (
							<>
								<div className="preview-wrap">
									<Player
										component={Component}
										durationInFrames={active.meta.durationInFrames}
										fps={active.meta.fps}
										compositionWidth={active.meta.width}
										compositionHeight={active.meta.height}
										style={{
											width: fitSize.width,
											height: fitSize.height,
										}}
										controls
										loop
									/>
								</div>

								<div>
									<div className="muted" style={{marginBottom: 6}}>
										{active.meta.width}×{active.meta.height} ·{' '}
										{active.meta.fps}fps ·{' '}
										{(active.meta.durationInFrames / active.meta.fps).toFixed(
											1,
										)}
										s
									</div>
									{active.summary && (
										<div className="muted" style={{marginBottom: 6}}>
											📝 {active.summary}
										</div>
									)}
								</div>

								<div className="row">
									<button
										onClick={startRender}
										disabled={active.status === 'rendering'}
									>
										{active.status === 'rendering'
											? `渲染中 ${Math.round(
													(active.renderProgress ?? 0) * 100,
												)}%`
											: active.status === 'rendered'
												? '重新渲染'
												: '渲染 mp4'}
									</button>
									{active.status === 'rendered' && (
										<a
											href={`/api/jobs/${active.id}/download`}
											style={{textDecoration: 'none'}}
										>
											<button className="secondary">下载 mp4</button>
										</a>
									)}
								</div>

								{active.status === 'rendering' && (
									<div className="progress-bar">
										<div
											style={{
												width: `${(active.renderProgress ?? 0) * 100}%`,
											}}
										/>
									</div>
								)}

								{active.status === 'rendered' && (
									<video
										src={`/api/jobs/${active.id}/download`}
										controls
										style={{
											width: '100%',
											maxHeight: 360,
											background: '#000',
										}}
									/>
								)}
							</>
						)}

						{(active.status === 'ready' ||
							active.status === 'rendering' ||
							active.status === 'rendered') &&
							!Component &&
							!loadFailed && (
								<div className="empty">加载 Composition 中…</div>
							)}

						{loadFailed && (
							<div className="error-box">
								Composition 模块加载失败。通常是生成的 tsx 里有运行时错误——
								打开浏览器 DevTools 的 Console 标签（F12）看红色报错，或直接看
								<code> src/generated/{active?.id}.tsx</code>。
								<div style={{marginTop: 8}}>
									<button
										className="secondary"
										onClick={() => window.location.reload()}
									>
										重新加载
									</button>
								</div>
							</div>
						)}

						<TerminalPanel events={liveEvents} />
						<ChatInput
							status={active.status}
							onCancel={cancelActive}
							onFeedback={sendFeedback}
						/>
					</>
				)}
			</div>
		</div>
	);
};
