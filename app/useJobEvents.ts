import {useEffect, useRef, useState} from 'react';
import type {StudioEvent} from '../server/types.js';

export type UseJobEventsStatus =
	| 'idle'
	| 'connecting'
	| 'open'
	| 'closed'
	| 'error';

export type UseJobEventsResult = {
	events: StudioEvent[];
	status: UseJobEventsStatus;
	connected: boolean;
};

export type UseJobEventsOptions = {
	enabled?: boolean;
	/** Override for tests. Defaults to globalThis.EventSource. */
	eventSourceFactory?: (url: string) => EventSource;
	/** Initial backoff in ms (defaults to 1000). */
	initialBackoffMs?: number;
	/** Max backoff in ms (defaults to 16000). */
	maxBackoffMs?: number;
};

const DEFAULT_INITIAL_BACKOFF = 1000;
const DEFAULT_MAX_BACKOFF = 16_000;

export function useJobEvents(
	jobId: string | null,
	opts: UseJobEventsOptions = {},
): UseJobEventsResult {
	const {
		enabled = true,
		eventSourceFactory,
		initialBackoffMs = DEFAULT_INITIAL_BACKOFF,
		maxBackoffMs = DEFAULT_MAX_BACKOFF,
	} = opts;

	const [events, setEvents] = useState<StudioEvent[]>([]);
	const [status, setStatus] = useState<UseJobEventsStatus>('idle');

	const esRef = useRef<EventSource | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastEventIdRef = useRef<number>(-1);
	const attemptRef = useRef<number>(0);
	const disposedRef = useRef<boolean>(false);

	useEffect(() => {
		if (!enabled || !jobId) {
			setStatus('idle');
			setEvents([]);
			lastEventIdRef.current = -1;
			attemptRef.current = 0;
			return;
		}

		disposedRef.current = false;
		// New job → reset.
		setEvents([]);
		lastEventIdRef.current = -1;
		attemptRef.current = 0;

		const factory: (url: string) => EventSource =
			eventSourceFactory ??
			((url: string) => new globalThis.EventSource(url));

		const connect = (): void => {
			if (disposedRef.current) return;

			setStatus('connecting');

			const since = lastEventIdRef.current + 1;
			const url = `/api/jobs/${encodeURIComponent(jobId)}/events${
				since > 0 ? `?since=${since}` : ''
			}`;
			const es = factory(url);
			esRef.current = es;

			es.addEventListener('open', () => {
				if (disposedRef.current) return;
				attemptRef.current = 0;
				setStatus('open');
			});

			es.addEventListener('studio', (raw) => {
				if (disposedRef.current) return;
				const msg = raw as MessageEvent<string>;
				let ev: StudioEvent;
				try {
					ev = JSON.parse(msg.data) as StudioEvent;
				} catch {
					return;
				}
				const idNum = Number.parseInt(msg.lastEventId ?? '', 10);
				if (Number.isFinite(idNum)) {
					if (idNum <= lastEventIdRef.current) return;
					lastEventIdRef.current = idNum;
				}
				setEvents((prev) => [...prev, ev]);
			});

			es.addEventListener('error', () => {
				if (disposedRef.current) return;
				// EventSource's own reconnect is unreliable and ignores backoff;
				// close and schedule our own.
				es.close();
				esRef.current = null;

				// Server closed cleanly after flushing replay (terminal job) →
				// readyState === CLOSED and we've seen events. Treat as done.
				if (status === 'open' && es.readyState === es.CLOSED) {
					// fall through to reconnect attempt — the ring might have more.
				}

				setStatus('error');
				const attempt = attemptRef.current;
				attemptRef.current = attempt + 1;
				const delay = Math.min(
					maxBackoffMs,
					initialBackoffMs * 2 ** attempt,
				);
				reconnectTimerRef.current = setTimeout(() => {
					reconnectTimerRef.current = null;
					connect();
				}, delay);
			});
		};

		connect();

		return () => {
			disposedRef.current = true;
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
			if (esRef.current) {
				esRef.current.close();
				esRef.current = null;
			}
			setStatus('closed');
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [jobId, enabled]);

	return {
		events,
		status,
		connected: status === 'open',
	};
}
