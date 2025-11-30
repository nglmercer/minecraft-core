import type { CoreStrategy } from './CoreStrategy';
import { type UnifiedBuild, type PaperVersionsResponse, type PaperBuildsResponse, type PaperBuildResponse } from '../types';

export class PaperStrategy implements CoreStrategy {
    readonly name = 'PaperMC';
    readonly baseUrl = 'https://api.papermc.io/v2';

    async getVersions(project: string): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/projects/${project}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch versions for ${project}: ${response.statusText}`);
        }
        const data = await response.json();
        const parsed = data as PaperVersionsResponse;
        return parsed.versions;
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(`${this.baseUrl}/projects/${project}/versions/${version}/builds`);
        if (!response.ok) {
            throw new Error(`Failed to fetch builds for ${project} ${version}: ${response.statusText}`);
        }
        const data = await response.json();
        const parsed = data as PaperBuildsResponse;

        return parsed.builds.map(build => this.mapToUnifiedBuild(project, version, build));
    }

    async getLatestBuild(project: string, version: string): Promise<UnifiedBuild> {
        const builds = await this.getBuilds(project, version);
        if (builds.length === 0) {
            throw new Error(`No builds found for ${project} ${version}`);
        }
        // Assuming the last build in the array is the latest, but we should probably sort by buildId to be safe if the API doesn't guarantee order
        const build = builds[builds.length - 1];
        if (!build) throw new Error(`No builds found for ${project} ${version}`);
        return build;
    }

    async getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string> {
        return `${this.baseUrl}/projects/${project}/versions/${version}/builds/${buildId}/downloads/${fileName}`;
    }

    private mapToUnifiedBuild(project: string, version: string, build: PaperBuildResponse): UnifiedBuild {
        return {
            core: project as any, // TODO: Validate against ServerCoreSchema if needed, but 'paper', 'velocity', etc are valid
            version: version,
            buildId: build.build.toString(),
            timestamp: new Date(build.time),
            downloads: {
                application: {
                    name: build.downloads.application.name,
                    url: `${this.baseUrl}/projects/${project}/versions/${version}/builds/${build.build}/downloads/${build.downloads.application.name}`,
                    hash: build.downloads.application.sha256,
                    hashType: 'sha256',
                    downloadType: 'binary'
                }
            }
        };
    }
}
