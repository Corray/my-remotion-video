import { config } from "@remotion/eslint-config-flat";

const base = Array.isArray(config) ? config : [config];

export default [
	...base,
	// LLM-generated compositions live here. They are ephemeral, gitignored,
	// and not hand-curated code — excluding them from lint avoids noise.
	{
		ignores: ["src/generated/**", ".worktrees/**", "out/**"],
	},
];
