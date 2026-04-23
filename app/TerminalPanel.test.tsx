// @vitest-environment happy-dom
import {cleanup, render, screen, fireEvent} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import React from 'react';
import {TerminalPanel} from './TerminalPanel.js';
import type {StudioEvent} from '../server/types.js';

afterEach(() => {
	cleanup();
});

const started = (turn = 0, ts = 1): StudioEvent => ({
	type: 'started',
	turn,
	ts,
});
const token = (delta: string, ts = 2): StudioEvent => ({
	type: 'token',
	delta,
	turn: 0,
	ts,
});
const tsxWritten = (path: string, ts = 3): StudioEvent => ({
	type: 'tsx_written',
	path,
	turn: 0,
	ts,
});
const compileOk = (ts = 4): StudioEvent => ({
	type: 'compile_check',
	ok: true,
	turn: 0,
	ts,
});
const compileFail = (errors: string[], ts = 5): StudioEvent => ({
	type: 'compile_check',
	ok: false,
	errors,
	turn: 0,
	ts,
});
const userFeedback = (content: string, turn = 1, ts = 6): StudioEvent => ({
	type: 'user_feedback',
	content,
	turn,
	ts,
});
const doneEv = (ts = 7): StudioEvent => ({
	type: 'done',
	summary: '一个测试场景',
	meta: {durationInFrames: 300, fps: 30, width: 1080, height: 1920},
	turn: 0,
	ts,
});

describe('TerminalPanel', () => {
	it('renders testid wrapper even with no events', () => {
		render(<TerminalPanel events={[]} />);
		expect(screen.getByTestId('terminal-panel')).toBeTruthy();
		expect(screen.getByText(/暂无事件/)).toBeTruthy();
	});

	it('default concise mode hides token/thinking/tool_args_delta events', () => {
		const events: StudioEvent[] = [
			started(),
			token('hello'),
			token(' world'),
			tsxWritten('src/generated/gen-1.tsx'),
			compileOk(),
		];
		render(<TerminalPanel events={events} />);
		// 3 concise lines: started / tsx_written / compile_check
		expect(screen.getAllByTestId('terminal-line-started')).toHaveLength(1);
		expect(screen.getAllByTestId('terminal-line-tsx_written')).toHaveLength(1);
		expect(screen.getAllByTestId('terminal-line-compile_check')).toHaveLength(1);
		expect(screen.queryByTestId('terminal-line-token')).toBeNull();
	});

	it('verbose mode shows token events', () => {
		const events: StudioEvent[] = [started(), token('hi'), token('there')];
		render(<TerminalPanel events={events} defaultVerbosity="verbose" />);
		expect(screen.getAllByTestId('terminal-line-token')).toHaveLength(2);
	});

	it('toggles concise <-> verbose via buttons', () => {
		const events: StudioEvent[] = [started(), token('x'), token('y')];
		render(<TerminalPanel events={events} />);
		expect(screen.queryByTestId('terminal-line-token')).toBeNull();
		fireEvent.click(screen.getByTestId('terminal-verbose-btn'));
		expect(screen.getAllByTestId('terminal-line-token')).toHaveLength(2);
		fireEvent.click(screen.getByTestId('terminal-concise-btn'));
		expect(screen.queryByTestId('terminal-line-token')).toBeNull();
	});

	it('renders user_feedback with the content text', () => {
		render(<TerminalPanel events={[userFeedback('改成蓝色背景')]} />);
		expect(screen.getByText(/改成蓝色背景/)).toBeTruthy();
	});

	it('renders done event with summary and dimensions', () => {
		render(<TerminalPanel events={[doneEv()]} />);
		expect(screen.getByText(/1080×1920/)).toBeTruthy();
		expect(screen.getByText(/一个测试场景/)).toBeTruthy();
	});

	it('renders compile error with error text', () => {
		render(
			<TerminalPanel
				events={[compileFail(['line 3: Unexpected token'])]}
			/>,
		);
		expect(screen.getByText(/Unexpected token/)).toBeTruthy();
	});

	it('collapses oldest lines when exceeding maxLines', () => {
		const many: StudioEvent[] = [];
		for (let i = 0; i < 250; i++) {
			many.push(tsxWritten(`gen-${i}.tsx`, i));
		}
		render(<TerminalPanel events={many} maxLines={200} />);
		expect(screen.getByText(/\+50 已折叠/)).toBeTruthy();
		// Only 200 lines rendered
		expect(screen.getAllByTestId('terminal-line-tsx_written')).toHaveLength(
			200,
		);
	});
});
