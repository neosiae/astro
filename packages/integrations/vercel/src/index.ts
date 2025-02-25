import type { AstroAdapter, AstroConfig, AstroIntegration, RouteData } from 'astro';
import type { PathLike } from 'fs';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const writeJson = (path: PathLike, data: any) =>
	fs.writeFile(path, JSON.stringify(data), { encoding: 'utf-8' });

const ENTRYFILE = '__astro_entry';

export function getAdapter(): AstroAdapter {
	return {
		name: '@astrojs/vercel',
		serverEntrypoint: '@astrojs/vercel/server-entrypoint',
		exports: ['default'],
	};
}

export default function vercel(): AstroIntegration {
	let _config: AstroConfig;
	let _serverEntry: URL;

	return {
		name: '@astrojs/vercel',
		hooks: {
			'astro:config:setup': ({ config }) => {
				config.outDir = new URL('./.output/', config.root);
				config.build.format = 'directory';
			},
			'astro:config:done': ({ setAdapter, config }) => {
				setAdapter(getAdapter());
				_config = config;
				_serverEntry = new URL(`./server/pages/${ENTRYFILE}.js`, config.outDir);
			},
			'astro:build:setup': ({ vite, target }) => {
				if (target === 'server') {
					vite.build!.rollupOptions = {
						input: [],
						output: {
							format: 'cjs',
							file: fileURLToPath(_serverEntry),
							dir: undefined,
							entryFileNames: undefined,
							chunkFileNames: undefined,
							assetFileNames: undefined,
							inlineDynamicImports: true,
						},
					};
				}
			},
			'astro:build:start': async ({ buildConfig }) => {
				buildConfig.serverEntry = `${ENTRYFILE}.js`;
				buildConfig.client = new URL('./static/', _config.outDir);
				buildConfig.server = new URL('./server/pages/', _config.outDir);
			},
			'astro:build:done': async ({ routes }) => {
				// Bundle dependecies
				await esbuild.build({
					entryPoints: [fileURLToPath(_serverEntry)],
					outfile: fileURLToPath(_serverEntry),
					bundle: true,
					format: 'cjs',
					platform: 'node',
					target: 'node14',
					allowOverwrite: true,
					minifyWhitespace: true,
				});

				let staticRoutes: RouteData[] = [];
				let dynamicRoutes: RouteData[] = [];

				for (const route of routes) {
					if (route.params.length === 0) staticRoutes.push(route);
					else dynamicRoutes.push(route);
				}

				// Routes Manifest
				// https://vercel.com/docs/file-system-api#configuration/routes
				await writeJson(new URL(`./routes-manifest.json`, _config.outDir), {
					version: 3,
					basePath: '/',
					pages404: false,
					rewrites: staticRoutes.map((route) => ({
						source: route.pathname,
						regex: route.pattern.toString(),
						destination: `/${ENTRYFILE}`,
					})),
					dynamicRoutes: dynamicRoutes.map((route) => ({
						page: `/${ENTRYFILE}`,
						regex: route.pattern.toString(),
					})),
				});
			},
		},
	};
}
