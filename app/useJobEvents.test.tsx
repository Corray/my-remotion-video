// @vitest-environment happy-dom
import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useJobEvents} from './useJobEvents.js';

type Listener = (ev: Event) => void;

class MockEventSource {
	static instances: MockEventSource[] = [];
	url: string;
	readyState: number = 0;
	CONNECTING = 0;
	OPEN = 1;
	CLOSED = 2;
	private listeners: Record<string, Listener[]> = {};
	closed = false;

	constructor(url: string) {
		this.url = url;
		MockEventSource.instances.push(this);
	}

	addEventListener(type: string, fn: Listener): void {
		(this.listeners[type] ??= []).push(fn);
	}

	removeEventListener(type: string, fn: Listener): void {
		this.listeners[type] = (this.listeners[type] ?? []).filter(
			(x) => x !== fn,
		);
	}

	dispatch(type: string, ev: Event): void {
		for (const fn of this.listeners[type] ?? []) fn(ev);
	}

	emitOpen(): void {
		this.readyState = this.OPEN;
		this.dispatch('open', new Event('open'));
	}

	emitStudio(id: number, payload: unknown): void {
		const ev = new MessageEvent('studio', {
			data: JSON.stringify(payload),
			lastEventId: String(id),
		});
		this.dispatch('studio', ev);
	}

	emitError(): void {
		this.readyState = this.CLOSED;
		this.dispatch('error', new Event('error'));
	}

	close(): void {
		this.closed = true;
		this.readyState = this.CLOSED;
	}
}

function mkFactory() {
	return (url: string) => new MockEventSource(url) as unknown as EventSource;
}

beforeEach(() => {
	MockEventSource.instances = [];
});

afterEach(() => {
	vi.useRealTimers();
});

describe('useJobEvents', () => {
	it('does not connect when jobId is null', () => {
		const factory = vi.fn(mkFactory());
		const {result} = renderHook(() =>
			useJobEvents(null, {eventSourceFactory: factory}),
		);
		expect(factory).not.toHaveBeenCalled();
		expect(result.current.status).toBe('idle');
		expect(result.current.events).toEqual([]);
	});

	it('does not connect when enabled=false', () => {
		const factory = vi.fn(mkFactory());
		renderHook(() =>
			useJobEvents('j1', {enabled: false, eventSourceFactory: factory}),
		);
		expect(factory).not.toHaveBeenCalled();
	});

	it('connects and accumulates studio events', async () => {
		const {result} = renderHook(() =>
			useJobEvents('j1', {eventSourceFactory: mkFactory()}),
		);

		await waitFor(() => {
			expect(MockEventSource.instances).toHaveLength(1);
		});
		expect(MockEventSource.instances[0].url).toBe('/api/jobs/j1/events');
		expect(result.current.status).toBe('connecting');

		const es = MockEventSource.instances[0];
		act(() => {
			es.emitOpen();
		});
		expect(result.current.status).toBe('open');
		expect(result.current.connected).toBe(true);

		act(() => {
			es.emitStudio(0, {type: 'started', turn: 0, ts: 1});
			es.emitStudio(1, {type: 'token', delta: 'hi', turn: 0, ts: 2});
		});

		expect(result.current.events).toHaveLength(2);
		expect(result.current.events[0]).toMatchObject({type: 'started'});
		expect(result.current.events[1]).toMatchObject({
			type: 'token',
			delta: 'hi',
		});
	});

	it('ignores duplicate event ids during replay/reconnect', () => {
		const {result} = renderHook(() =>
			useJobEvents('j1', {eventSourceFactory: mkFactory()}),
		);
		const es = MockEventSource.instances[0];
		act(() => {
			es.emitOpen();
			es.emitStudio(0, {type: 'started', turn: 0, ts: 1});
			es.emitStudio(1, {type: 'token', delta: 'a', turn: 0, ts: 2});
			// Duplicate id 1 must be dropped.
			es.emitStudio(1, {type: 'token', delta: 'DUP', turn: 0, ts: 2});
		});
		expect(result.current.events).toHaveLength(2);
	});

	it('closes EventSource and schedules reconnect on error with exponential backoff', () => {
		vi.useFakeTimers();
		const {result} = renderHook(() =>
			useJobEvents('j1', {
				eventSourceFactory: mkFactory(),
				initialBackoffMs: 1000,
				maxBackoffMs: 16_000,
			}),
		);

		const first = MockEventSource.instances[0];
		act(() => {
			first.emitOpen();
			first.emitStudio(0, {type: 'started', turn: 0, ts: 1});
			first.emitError();
		});
		expect(first.closed).toBe(true);
		expect(result.current.status).toBe('error');

		// Not yet reconnected (backoff not elapsed).
		expect(MockEventSource.instances).toHaveLength(1);

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(MockEventSource.instances).toHaveLength(2);
		// Reconnect URL should carry ?since=1 (lastEventId was 0 → since=1).
		expect(MockEventSource.instances[1].url).toBe(
			'/api/jobs/j1/events?since=1',
		);

		// Second error → 2s backoff.
		act(() => {
			MockEventSource.instances[1].emitError();
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(MockEventSource.instances).toHaveLength(2);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(MockEventSource.instances).toHaveLength(3);
	});

	it('caps backoff at maxBackoffMs', () => {
		vi.useFakeTimers();
		renderHook(() =>
			useJobEvents('j1', {
				eventSourceFactory: mkFactory(),
				initialBackoffMs: 1000,
				maxBackoffMs: 4000,
			}),
		);
		// Burn several failures.
		for (let i = 0; i < 5; i++) {
			const es =
				MockEventSource.instances[MockEventSource.instances.length - 1];
			act(() => {
				es.emitOpen();
				es.emitError();
			});
			act(() => {
				vi.advanceTimersByTime(10_000);
			});
		}
		// After the 5th failure we should have created 6 instances (0..5).
		expect(MockEventSource.instances.length).toBe(6);
	});

	it('closes connection on unmount', () => {
		const {unmount} = renderHook(() =>
			useJobEvents('j1', {eventSourceFactory: mkFactory()}),
		);
		const es = MockEventSource.instances[0];
		unmount();
		expect(es.closed).toBe(true);
	});

	it('resets events and reconnects when jobId changes', () => {
		const {result, rerender} = renderHook(
			({id}: {id: string | null}) =>
				useJobEvents(id, {eventSourceFactory: mkFactory()}),
			{initialProps: {id: 'j1' as string | null}},
		);
		const first = MockEventSource.instances[0];
		act(() => {
			first.emitOpen();
			first.emitStudio(0, {type: 'started', turn: 0, ts: 1});
		});
		expect(result.current.events).toHaveLength(1);

		rerender({id: 'j2'});
		expect(first.closed).toBe(true);
		expect(MockEventSource.instances[1].url).toBe('/api/jobs/j2/events');
		expect(result.current.events).toHaveLength(0);
	});
});
