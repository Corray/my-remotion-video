import React, {useCallback, useState} from 'react';
import type {JobStatus} from '../server/types.js';

export type ChatInputProps = {
	status: JobStatus | null;
	onCancel: () => void;
	onFeedback: (content: string) => void;
};

export const ChatInput: React.FC<ChatInputProps> = ({
	status,
	onCancel,
	onFeedback,
}) => {
	const [draft, setDraft] = useState('');
	const generating = status === 'generating';

	const submit = useCallback(() => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		onFeedback(trimmed);
		setDraft('');
	}, [draft, onFeedback]);

	const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			submit();
		}
	};

	return (
		<div
			data-testid="chat-input"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				padding: '8px 0',
				borderTop: '1px solid var(--border)',
			}}
		>
			<div style={{display: 'flex', gap: 8, alignItems: 'flex-start'}}>
				<textarea
					data-testid="feedback-textarea"
					placeholder="对生成结果提反馈（Cmd/Ctrl+Enter 发送）…"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={onKeyDown}
					style={{minHeight: 64, flex: 1}}
				/>
			</div>
			<div className="row" style={{justifyContent: 'space-between'}}>
				<div className="row" style={{gap: 6}}>
					{/* Q1 Phase 1: attachment UI reserved but disabled until
					    backend T008 accepts multipart + attachments in
					    ConversationTurn. Tracked as a follow-up in
					    docs/tasks/2026-04-studio-chat/iterate-consensus.md Q1. */}
					<button
						data-testid="attach-btn"
						type="button"
						className="secondary"
						disabled
						title="暂不支持在反馈中追加素材（后续版本）"
						style={{padding: '6px 12px', fontSize: 12}}
					>
						📎 素材 (coming soon)
					</button>
				</div>
				<div className="row" style={{gap: 6}}>
					<button
						data-testid="cancel-btn"
						type="button"
						className="secondary"
						disabled={!generating}
						onClick={onCancel}
						style={{padding: '6px 12px', fontSize: 12}}
						aria-label="中断"
					>
						⏹ 中断
					</button>
					<button
						data-testid="feedback-send-btn"
						type="button"
						disabled={!draft.trim()}
						onClick={submit}
						style={{padding: '6px 12px', fontSize: 12}}
					>
						发送反馈
					</button>
				</div>
			</div>
		</div>
	);
};
