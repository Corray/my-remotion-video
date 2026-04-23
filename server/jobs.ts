import type {Job} from './types.js';

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
