import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';


export class VanillaStrategy implements CoreStrategy {
    readonly name = 'Vanilla';
    readonly baseUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
    private manifestCache: VanillaManifest | null = null;

    private async getManifest() {
        if (this.manifestCache) return this.manifestCache;
        const response = await fetch(this.baseUrl);
        if (!response.ok) throw new Error('Failed to fetch vanilla manifest');
        const data = await response.json();
        this.manifestCache = data as VanillaManifest;
        return this.manifestCache;
    }

    async getVersions(project: string): Promise<string[]> {
        const manifest = await this.getManifest();
        return manifest.versions.map(v => v.id);
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        // Vanilla only has one "build" per version really
        const manifest = await this.getManifest();
        const versionInfo = manifest.versions.find(v => v.id === version);
        if (!versionInfo) throw new Error(`Version ${version} not found in vanilla manifest`);

        const detailsRes = await fetch(versionInfo.url);
        if (!detailsRes.ok) throw new Error(`Failed to fetch details for ${version}`);
        const detailsData = await detailsRes.json();
        const details = detailsData as VanillaVersionDetails;

        return [{
            core: 'vanilla',
            version: version,
            buildId: version, // Use version as buildId
            timestamp: new Date(versionInfo.releaseTime),
            downloads: {
                application: {
                    name: `server.jar`,
                    url: details.downloads.server.url,
                    hash: details.downloads.server.sha1,
                    hashType: 'sha1',
                    size: details.downloads.server.size,
                    downloadType: 'binary'
                }
            }
        }];
    }

    async getLatestBuild(project: string, version: string): Promise<UnifiedBuild> {
        const builds = await this.getBuilds(project, version);
        const build = builds[0];
        if (!build) throw new Error(`No builds found for ${project} ${version}`);
        return build;
    }

    async getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string> {
        const build = await this.getLatestBuild(project, version);
        return build.downloads.application.url;
    }
}

interface VanillaManifest {
    latest: {
        release: string;
        snapshot: string;
    };
    versions: {
        id: string;
        type: string;
        url: string;
        time: string;
        releaseTime: string;
    }[];
}

interface VanillaVersionDetails {
    downloads: {
        server: {
            sha1: string;
            size: number;
            url: string;
        };
    };
}
