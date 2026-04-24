import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');

export default defineConfig({
	plugins: [react()],
	root: __dirname,
	// Expose the Remotion project's public/ so staticFile('generated/<id>/<f>')
	// resolves in the <Player> preview.
	publicDir: path.join(projectRoot, 'public'),
	// Expose the absolute path to the Remotion project root as a compile-time
	// constant, so the frontend can load fresh compositions via /@fs/<abs>.
	define: {
		__PROJECT_ROOT__: JSON.stringify(projectRoot),
	},
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://localhost:3001',
		},
		fs: {
			allow: [projectRoot],
		},
	},
});
