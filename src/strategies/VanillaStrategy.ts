import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';
import { z } from 'zod';

const VanillaManifestSchema = z.object({
    latest: z.object({
        release: z.string(),
        snapshot: z.string()
    }),
    versions: z.array(z.object({
        id: z.string(),
        type: z.string(),
        url: z.string(),
        time: z.string(),
        releaseTime: z.string()
    }))
});

const VanillaVersionDetailsSchema = z.object({
    downloads: z.object({
        server: z.object({
            sha1: z.string(),
            size: z.number(),
            url: z.string()
        })
    })
});

export class VanillaStrategy implements CoreStrategy {
    readonly name = 'Vanilla';
    readonly baseUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
    private manifestCache: z.infer<typeof VanillaManifestSchema> | null = null;

    private async getManifest() {
        if (this.manifestCache) return this.manifestCache;
        const response = await fetch(this.baseUrl);
        if (!response.ok) throw new Error('Failed to fetch vanilla manifest');
        const data = await response.json();
        this.manifestCache = VanillaManifestSchema.parse(data);
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
        const details = VanillaVersionDetailsSchema.parse(detailsData);

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
