import type { UnifiedBuild } from '../types';

export interface CoreStrategy {
    readonly name: string;
    readonly baseUrl: string;

    getVersions(project: string): Promise<string[]>;
    getBuilds(project: string, version: string): Promise<UnifiedBuild[]>;
    getLatestBuild(project: string, version: string): Promise<UnifiedBuild>;
    getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string>;
}
