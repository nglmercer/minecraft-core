import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';


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
        const parsed = data as PurpurVersionsResponse;
        return parsed.versions;
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(`${this.baseUrl}/${project}/${version}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch builds for ${project} ${version}: ${response.statusText}`);
        }
        const data = await response.json();
        const parsed = data as PurpurBuildsResponse;

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
        const parsed = data as PurpurBuildsResponse;
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
        const parsed = data as PurpurBuildResponse;

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

interface PurpurVersionsResponse {
    project: string;
    versions: string[];
}

interface PurpurBuildsResponse {
    project: string;
    version: string;
    builds: {
        latest: string;
        all: string[];
    };
}

interface PurpurBuildResponse {
    project: string;
    version: string;
    build: string;
    result: string;
    timestamp: number;
    md5?: string;
    commits?: any[];
}
