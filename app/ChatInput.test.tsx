// @vitest-environment happy-dom
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import React from 'react';
import {ChatInput} from './ChatInput.js';

afterEach(() => {
	cleanup();
});

describe('ChatInput', () => {
	it('renders core controls', () => {
		render(
			<ChatInput status="ready" onCancel={() => {}} onFeedback={() => {}} />,
		);
		expect(screen.getByTestId('feedback-textarea')).toBeTruthy();
		expect(screen.getByTestId('cancel-btn')).toBeTruthy();
		expect(screen.getByTestId('feedback-send-btn')).toBeTruthy();
		expect(screen.getByTestId('attach-btn')).toBeTruthy();
	});

	it('cancel button disabled when not generating', () => {
		render(
			<ChatInput status="ready" onCancel={() => {}} onFeedback={() => {}} />,
		);
		const btn = screen.getByTestId('cancel-btn') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it('cancel button enabled when generating and fires onCancel', () => {
		const onCancel = vi.fn();
		render(
			<ChatInput
				status="generating"
				onCancel={onCancel}
				onFeedback={() => {}}
			/>,
		);
		const btn = screen.getByTestId('cancel-btn') as HTMLButtonElement;
		expect(btn.disabled).toBe(false);
		fireEvent.click(btn);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('send button disabled when textarea empty', () => {
		render(
			<ChatInput status="ready" onCancel={() => {}} onFeedback={() => {}} />,
		);
		const btn = screen.getByTestId('feedback-send-btn') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it('send fires onFeedback with trimmed content and clears textarea', () => {
		const onFeedback = vi.fn();
		render(
			<ChatInput
				status="ready"
				onCancel={() => {}}
				onFeedback={onFeedback}
			/>,
		);
		const ta = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement;
		fireEvent.change(ta, {target: {value: '   蓝色背景   '}});
		fireEvent.click(screen.getByTestId('feedback-send-btn'));
		expect(onFeedback).toHaveBeenCalledWith('蓝色背景');
		expect(ta.value).toBe('');
	});

	it('Cmd+Enter sends feedback', () => {
		const onFeedback = vi.fn();
		render(
			<ChatInput
				status="ready"
				onCancel={() => {}}
				onFeedback={onFeedback}
			/>,
		);
		const ta = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement;
		fireEvent.change(ta, {target: {value: '改成蓝色'}});
		fireEvent.keyDown(ta, {key: 'Enter', metaKey: true});
		expect(onFeedback).toHaveBeenCalledWith('改成蓝色');
	});

	it('Ctrl+Enter sends feedback', () => {
		const onFeedback = vi.fn();
		render(
			<ChatInput
				status="ready"
				onCancel={() => {}}
				onFeedback={onFeedback}
			/>,
		);
		const ta = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement;
		fireEvent.change(ta, {target: {value: 'hi'}});
		fireEvent.keyDown(ta, {key: 'Enter', ctrlKey: true});
		expect(onFeedback).toHaveBeenCalledWith('hi');
	});

	it('plain Enter does not send', () => {
		const onFeedback = vi.fn();
		render(
			<ChatInput
				status="ready"
				onCancel={() => {}}
				onFeedback={onFeedback}
			/>,
		);
		const ta = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement;
		fireEvent.change(ta, {target: {value: 'hi'}});
		fireEvent.keyDown(ta, {key: 'Enter'});
		expect(onFeedback).not.toHaveBeenCalled();
	});

	it('empty/whitespace-only feedback does not trigger onFeedback', () => {
		const onFeedback = vi.fn();
		render(
			<ChatInput
				status="ready"
				onCancel={() => {}}
				onFeedback={onFeedback}
			/>,
		);
		const ta = screen.getByTestId('feedback-textarea') as HTMLTextAreaElement;
		fireEvent.change(ta, {target: {value: '   '}});
		fireEvent.keyDown(ta, {key: 'Enter', metaKey: true});
		expect(onFeedback).not.toHaveBeenCalled();
	});

	it('attach button is disabled (Q1 Phase 1)', () => {
		render(
			<ChatInput status="ready" onCancel={() => {}} onFeedback={() => {}} />,
		);
		const btn = screen.getByTestId('attach-btn') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});
});
