import type {
	RouteData,
	SerializedRouteData,
	ComponentInstance,
	SSRLoadedRenderer,
} from '../../@types/astro';
import type { MarkdownRenderingOptions } from '@astrojs/markdown-remark';

export type ComponentPath = string;

export interface RouteInfo {
	routeData: RouteData;
	file: string;
	links: string[];
	scripts: string[];
}

export type SerializedRouteInfo = Omit<RouteInfo, 'routeData'> & {
	routeData: SerializedRouteData;
};

export interface SSRManifest {
	routes: RouteInfo[];
	site?: string;
	markdown: MarkdownRenderingOptions;
	pageMap: Map<ComponentPath, ComponentInstance>;
	renderers: SSRLoadedRenderer[];
	entryModules: Record<string, string>;
}

export type SerializedSSRManifest = Omit<SSRManifest, 'routes'> & {
	routes: SerializedRouteInfo[];
};

export type AdapterCreateExports<T = any> = (
	manifest: SSRManifest,
	args?: T
) => Record<string, any>;
