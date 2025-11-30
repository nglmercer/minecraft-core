import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';
import { z } from 'zod';

const MohistVersionsResponseSchema = z.array(z.string());

const MohistBuildSchema = z.object({
    number: z.number().optional(),
    id: z.string().optional(), // Some builds might use string IDs
    gitSha: z.string(),
    fileMd5: z.string(),
    fileSha256: z.string(),
    url: z.string(),
    createdAt: z.number()
});

const MohistBuildsResponseSchema = z.object({
    projectName: z.string(),
    projectVersion: z.string(),
    builds: z.array(MohistBuildSchema)
});

export class MohistStrategy implements CoreStrategy {
    readonly name = 'MohistMC';
    readonly baseUrl = 'https://mohistmc.com/api/v2';

    async getVersions(project: string): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/projects/${project}`);
        if (!response.ok) throw new Error(`Failed to fetch versions for ${project}`);

        const data = await response.json();
        // The API returns a list of versions directly? Or object?
        // Based on previous inspection: ["1.7.10", "1.12.2", ...]
        const parsed = MohistVersionsResponseSchema.parse(data);
        return parsed;
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(`${this.baseUrl}/projects/${project}/${version}/builds`);
        if (!response.ok) throw new Error(`Failed to fetch builds for ${project} ${version}`);

        const data = await response.json();
        const parsed = MohistBuildsResponseSchema.parse(data);

        return parsed.builds.map(build => {
            const buildId = build.number ? build.number.toString() : (build.id || 'unknown');
            return {
                core: project as any,
                version: version,
                buildId: buildId,
                timestamp: new Date(build.createdAt),
                downloads: {
                    application: {
                        name: `${project}-${version}-${buildId}.jar`,
                        url: build.url, // Direct download URL provided by API
                        hash: build.fileSha256,
                        hashType: 'sha256',
                        downloadType: 'path' // Mohist API returns a file path string, not binary
                    }
                }
            };
        });
    }

    async getLatestBuild(project: string, version: string): Promise<UnifiedBuild> {
        const builds = await this.getBuilds(project, version);
        if (builds.length === 0) throw new Error(`No builds found for ${project} ${version}`);
        const build = builds[builds.length - 1];
        if (!build) throw new Error(`No builds found for ${project} ${version}`);
        return build;
    }

    async getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string> {
        // We can construct it if we know the pattern, but getBuilds gives us the URL.
        // https://mohistmc.com/api/v2/projects/mohist/{version}/builds/{number}/download
        return `${this.baseUrl}/projects/${project}/${version}/builds/${buildId}/download`;
    }
}
