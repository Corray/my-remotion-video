import {EVENT_RING_CAP} from './types.js';
import type {Job, StudioEvent} from './types.js';

const jobs = new Map<string, Job>();

export function saveJob(job: Job) {
	job.updatedAt = Date.now();
	jobs.set(job.id, job);
	return job;
}

export function getJob(id: string): Job | undefined {
	return jobs.get(id);
}

export function listJobs(): Job[] {
	return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
	const existing = jobs.get(id);
	if (!existing) return undefined;
	const updated: Job = {...existing, ...patch, updatedAt: Date.now()};
	jobs.set(id, updated);
	return updated;
}

/**
 * Append a StudioEvent to a job's ring buffer.
 * Drops the oldest event when the buffer reaches EVENT_RING_CAP.
 * Returns the resulting events array (same reference — mutated in place).
 */
export function appendEvent(id: string, ev: StudioEvent): StudioEvent[] | undefined {
	const job = jobs.get(id);
	if (!job) return undefined;
	job.events.push(ev);
	while (job.events.length > EVENT_RING_CAP) {
		job.events.shift();
	}
	job.updatedAt = Date.now();
	return job.events;
}

/**
 * Test-only: reset the in-memory store. Do NOT call from production code.
 */
export function __resetJobsForTest(): void {
	jobs.clear();
}
