import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';
import { z } from 'zod';

const PurpurVersionsResponseSchema = z.object({
    project: z.string(),
    versions: z.array(z.string())
});

const PurpurBuildsResponseSchema = z.object({
    project: z.string(),
    version: z.string(),
    builds: z.object({
        latest: z.string(),
        all: z.array(z.string())
    })
});

const PurpurBuildResponseSchema = z.object({
    project: z.string(),
    version: z.string(),
    build: z.string(),
    result: z.string(),
    timestamp: z.number(),
    md5: z.string().optional(),
    commits: z.array(z.any()).optional() // We don't strictly need commit details
});

export class PurpurStrategy implements CoreStrategy {
    readonly name = 'PurpurMC';
    readonly baseUrl = 'https://api.purpurmc.org/v2';

    async getVersions(project: string): Promise<string[]> {
        // Purpur project is usually 'purpur'
        const response = await fetch(`${this.baseUrl}/${project}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch versions for ${project}: ${response.statusText}`);
        }
        const data = await response.json();
        const parsed = PurpurVersionsResponseSchema.parse(data);
        return parsed.versions;
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(`${this.baseUrl}/${project}/${version}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch builds for ${project} ${version}: ${response.statusText}`);
        }
        const data = await response.json();
        const parsed = PurpurBuildsResponseSchema.parse(data);

        // We only have IDs here, no hashes.
        return parsed.builds.all.map(buildId => ({
            core: project as any,
            version: version,
            buildId: buildId,
            downloads: {
                application: {
                    name: `${project}-${version}-${buildId}.jar`,
                    url: `${this.baseUrl}/${project}/${version}/${buildId}/download`,
                    // No hash available in list
                    downloadType: 'binary'
                }
            }
        }));
    }

    async getLatestBuild(project: string, version: string): Promise<UnifiedBuild> {
        const response = await fetch(`${this.baseUrl}/${project}/${version}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch builds for ${project} ${version}`);
        }
        const data = await response.json();
        const parsed = PurpurBuildsResponseSchema.parse(data);
        const latestBuildId = parsed.builds.latest;

        // Fetch details for latest build to get hash
        return this.getBuildDetails(project, version, latestBuildId);
    }

    async getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string> {
        return `${this.baseUrl}/${project}/${version}/${buildId}/download`;
    }

    private async getBuildDetails(project: string, version: string, buildId: string): Promise<UnifiedBuild> {
        const response = await fetch(`${this.baseUrl}/${project}/${version}/${buildId}`);
        if (!response.ok) throw new Error(`Failed to fetch build details for ${buildId}`);

        const data = await response.json();
        const parsed = PurpurBuildResponseSchema.parse(data);

        return {
            core: project as any,
            version: version,
            buildId: buildId,
            timestamp: new Date(parsed.timestamp),
            downloads: {
                application: {
                    name: `${project}-${version}-${buildId}.jar`,
                    url: `${this.baseUrl}/${project}/${version}/${buildId}/download`,
                    hash: parsed.md5,
                    hashType: 'md5',
                    downloadType: 'binary'
                }
            }
        };
    }
}
