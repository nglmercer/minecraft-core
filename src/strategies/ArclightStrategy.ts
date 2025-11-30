import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';


export class ArclightStrategy implements CoreStrategy {
    readonly name = 'Arclight';
    readonly baseUrl = 'https://api.github.com/repos/IzzelAliz/Arclight/releases';

    async getVersions(project: string): Promise<string[]> {
        const response = await fetch(this.baseUrl);
        if (!response.ok) throw new Error(`Failed to fetch Arclight releases: ${response.statusText}`);
        const releases = await response.json() as GitHubRelease[];

        const versions = new Set<string>();
        releases.forEach(release => {
            // Arclight tags examples: "1.20.4-1.0.5", "1.18.2-1.0.0", "Arclight-1.20.4-1.0.5"
            // Regex to capture the MC version (e.g., 1.20.4)
            // It usually starts with the version number or "Arclight-" followed by version number
            const match = release.tag_name.match(/^(?:Arclight-)?(\d+\.\d+(?:\.\d+)?)/);
            if (match && match[1]) {
                versions.add(match[1]);
            }
        });

        // console.log('Arclight versions found:', Array.from(versions));
        return Array.from(versions).sort();
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(this.baseUrl);
        if (!response.ok) throw new Error(`Failed to fetch Arclight releases: ${response.statusText}`);
        const releases = await response.json() as GitHubRelease[];

        const matchingReleases = releases.filter(r => r.tag_name.includes(version));

        if (matchingReleases.length === 0) {
            // Fallback: Arclight might have releases that don't explicitly have the version in the tag if it's a "latest" tag, but usually they do.
            // Or maybe we need to paginate if the version is old.
            // For now, let's assume recent releases.
            return [];
        }

        return matchingReleases.map(release => {
            const asset = release.assets.find(a => a.name.endsWith('.jar') && !a.name.includes('sources'));
            if (!asset) return null;

            const build: UnifiedBuild = {
                core: 'arclight',
                version: version,
                buildId: release.tag_name,
                timestamp: new Date(release.published_at),
                downloads: {
                    application: {
                        name: asset.name,
                        url: asset.browser_download_url,
                        size: asset.size,
                        downloadType: 'binary'
                    }
                }
            };
            return build;
        }).filter((b): b is UnifiedBuild => b !== null);
    }

    async getLatestBuild(project: string, version: string): Promise<UnifiedBuild> {
        const builds = await this.getBuilds(project, version);
        if (builds.length === 0) throw new Error(`No builds found for ${project} ${version}`);
        return builds[0]!;
    }

    async getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string> {
        const build = await this.getLatestBuild(project, version);
        return build.downloads.application.url;
    }
}

interface GitHubRelease {
    tag_name: string;
    published_at: string;
    assets: {
        name: string;
        browser_download_url: string;
        size: number;
    }[];
}
