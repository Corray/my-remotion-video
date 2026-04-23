import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {StudioEvent} from '../server/types.js';

export type TerminalVerbosity = 'concise' | 'verbose';

export type TerminalPanelProps = {
	events: StudioEvent[];
	defaultVerbosity?: TerminalVerbosity;
	maxLines?: number;
};

const MAX_LINES_DEFAULT = 200;

const CONCISE_TYPES: ReadonlySet<StudioEvent['type']> = new Set([
	'started',
	'user_feedback',
	'tsx_written',
	'compile_check',
	'retry',
	'done',
	'ready',
	'error',
	'cancelled',
] as StudioEvent['type'][]);

type Line = {
	prefix: string;
	text: string;
	color: string;
	key: string;
};

function classify(ev: StudioEvent, idx: number): Line {
	const key = `${idx}`;
	switch (ev.type) {
		case 'started':
			return {prefix: '→', text: `turn ${ev.turn} 启动`, color: '#2f81f7', key};
		case 'user_feedback':
			return {prefix: '>', text: ev.content, color: '#e6edf3', key};
		case 'tsx_written':
			return {prefix: '✓', text: `写入 ${ev.path}`, color: '#3fb950', key};
		case 'compile_check':
			return ev.ok
				? {prefix: '✓', text: '编译通过', color: '#3fb950', key}
				: {
						prefix: '✗',
						text: `编译失败: ${(ev.errors ?? []).join('; ').slice(0, 240) || '无细节'}`,
						color: '#f85149',
						key,
					};
		case 'retry':
			return {
				prefix: '↻',
				text: `重试 #${ev.attempt}: ${ev.reason}`,
				color: '#d29922',
				key,
			};
		case 'done':
			return {
				prefix: '✦',
				text: `完成: ${ev.summary} · ${ev.meta.width}×${ev.meta.height} · ${(ev.meta.durationInFrames / ev.meta.fps).toFixed(1)}s`,
				color: '#3fb950',
				key,
			};
		case 'cancelled':
			return {prefix: '⏹', text: '已中断', color: '#7d8590', key};
		case 'error':
			return {
				prefix: '!',
				text: `[${ev.stage}] ${ev.message}`,
				color: '#f85149',
				key,
			};
		case 'thinking':
			return {prefix: '…', text: ev.delta, color: '#7d8590', key};
		case 'token':
			return {prefix: ' ', text: ev.delta, color: '#c9d1d9', key};
		case 'tool_call_start':
			return {prefix: '⚙', text: `tool ${ev.name}()`, color: '#2f81f7', key};
		case 'tool_args_delta':
			return {prefix: ' ', text: ev.delta, color: '#8b949e', key};
		case 'tool_call_done':
			return {prefix: '⚙', text: 'tool 完成', color: '#2f81f7', key};
		default:
			return {prefix: '·', text: JSON.stringify(ev), color: '#7d8590', key};
	}
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
	events,
	defaultVerbosity = 'concise',
	maxLines = MAX_LINES_DEFAULT,
}) => {
	const [verbosity, setVerbosity] = useState<TerminalVerbosity>(defaultVerbosity);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const stickyRef = useRef<boolean>(true);

	const filtered = useMemo(() => {
		if (verbosity === 'verbose') return events;
		return events.filter((ev) => CONCISE_TYPES.has(ev.type));
	}, [events, verbosity]);

	const visible = useMemo(() => {
		if (filtered.length <= maxLines) return {lines: filtered, hidden: 0};
		return {
			lines: filtered.slice(filtered.length - maxLines),
			hidden: filtered.length - maxLines,
		};
	}, [filtered, maxLines]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el || !stickyRef.current) return;
		el.scrollTop = el.scrollHeight;
	}, [visible.lines.length, visible.hidden]);

	const onScroll = (): void => {
		const el = scrollRef.current;
		if (!el) return;
		const atBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight < 8;
		stickyRef.current = atBottom;
	};

	return (
		<div
			data-testid="terminal-panel"
			style={{
				display: 'flex',
				flexDirection: 'column',
				background: '#010409',
				border: '1px solid #30363d',
				borderRadius: 8,
				minHeight: 0,
				flex: 1,
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '6px 10px',
					borderBottom: '1px solid #30363d',
					fontSize: 12,
					color: '#7d8590',
				}}
			>
				<span>终端 · {visible.lines.length} 条{visible.hidden > 0 ? ` (+${visible.hidden} 已折叠)` : ''}</span>
				<div style={{display: 'flex', gap: 4}}>
					<button
						data-testid="terminal-concise-btn"
						type="button"
						className="secondary"
						aria-pressed={verbosity === 'concise'}
						onClick={() => setVerbosity('concise')}
						style={{
							padding: '2px 8px',
							fontSize: 12,
							fontWeight: verbosity === 'concise' ? 700 : 400,
							opacity: verbosity === 'concise' ? 1 : 0.6,
						}}
					>
						简洁
					</button>
					<button
						data-testid="terminal-verbose-btn"
						type="button"
						className="secondary"
						aria-pressed={verbosity === 'verbose'}
						onClick={() => setVerbosity('verbose')}
						style={{
							padding: '2px 8px',
							fontSize: 12,
							fontWeight: verbosity === 'verbose' ? 700 : 400,
							opacity: verbosity === 'verbose' ? 1 : 0.6,
						}}
					>
						详细
					</button>
				</div>
			</div>
			<div
				ref={scrollRef}
				onScroll={onScroll}
				data-testid="terminal-body"
				style={{
					flex: 1,
					overflow: 'auto',
					padding: '8px 10px',
					fontFamily:
						'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
					fontSize: 12,
					lineHeight: 1.5,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{visible.lines.length === 0 && (
					<div style={{color: '#7d8590'}}>（暂无事件，等待生成…）</div>
				)}
				{visible.lines.map((ev, i) => {
					const line = classify(
						ev,
						i + (events.length - visible.lines.length),
					);
					return (
						<div
							key={line.key}
							data-testid={`terminal-line-${ev.type}`}
							style={{color: line.color, display: 'flex', gap: 6}}
						>
							<span style={{minWidth: 14, textAlign: 'center'}}>
								{line.prefix}
							</span>
							<span>{line.text}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
