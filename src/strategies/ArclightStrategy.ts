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
            if (!release.tag_name) return; // Skip releases without tag_name
            
            // Try to extract version from JAR filenames first (most reliable)
            const jarAsset = release.assets.find(a => a.name.endsWith('.jar') && !a.name.includes('sources'));
            if (jarAsset) {
                // Extract Minecraft version from JAR filename
                // Examples: "arclight-forge-1.20.1-1.0.6.jar", "arclight-forge-1.20.4-1.0.5.jar"
                const jarMatch = jarAsset.name.match(/-(\d+\.\d+(?:\.\d+)?)-\d+\.\d+\.\d+\.jar$/);
                if (jarMatch && jarMatch[1]) {
                    versions.add(jarMatch[1]);
                    return; // Found version from JAR, skip tag parsing
                }
            }
            
            // Fallback: try to extract from tag name
            // Arclight tags examples: "1.20.4-1.0.5", "1.18.2-1.0.0", "Arclight-1.20.4-1.0.5", "Trials/1.0.6"
            const tagMatch = release.tag_name.match(/^(?:Arclight-)?(\d+\.\d+(?:\.\d+)?)/);
            if (tagMatch && tagMatch[1]) {
                versions.add(tagMatch[1]);
            } else if (release.tag_name.includes('Trials')) {
                // Special handling for Trials format: look at JAR files for version
                // This handles cases like "Trials/1.0.6" where we need the JAR to know MC version
                if (jarAsset) {
                    // Try alternative pattern for JAR files
                    const altJarMatch = jarAsset.name.match(/arclight-\w+-(\d+\.\d+(?:\.\d+)?)/);
                    if (altJarMatch && altJarMatch[1]) {
                        versions.add(altJarMatch[1]);
                    }
                }
            }
        });

        // console.log('Arclight versions found:', Array.from(versions));
        return Array.from(versions).sort();
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(this.baseUrl);
        if (!response.ok) throw new Error(`Failed to fetch Arclight releases: ${response.statusText}`);
        const releases = await response.json() as GitHubRelease[];

        // Filter releases that contain the target Minecraft version
        // Look in both tag names and JAR filenames
        const matchingReleases = releases.filter(r => {
            if (!r.tag_name) return false;
            
            // Check if tag name contains the version
            if (r.tag_name.includes(version)) return true;
            
            // Check if any JAR file contains the version
            const jarAsset = r.assets.find(a => a.name.endsWith('.jar') && !a.name.includes('sources'));
            if (jarAsset && jarAsset.name.includes(version)) return true;
            
            return false;
        });

        if (matchingReleases.length === 0) {
            // If no direct matches, try broader search - this handles cases like "Trials/1.0.6"
            // where we need to look at all releases and filter by JAR content
            const allReleases = releases.filter(r => {
                if (!r.tag_name) return false;
                
                const jarAsset = r.assets.find(a => a.name.endsWith('.jar') && !a.name.includes('sources'));
                if (!jarAsset) return false;
                
                // Check if JAR filename contains the target Minecraft version
                return jarAsset.name.includes(version);
            });
            
            if (allReleases.length === 0) {
                return [];
            }
            
            // Use the broader search results
            return allReleases.map(release => {
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
