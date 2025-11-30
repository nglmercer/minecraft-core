import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';
import { z } from 'zod';

const ForgePromotionsSchema = z.object({
    promos: z.record(z.string(), z.string())
});

export class ForgeStrategy implements CoreStrategy {
    readonly name = 'Forge';
    readonly baseUrl = 'https://files.minecraftforge.net/net/minecraftforge/forge';
    readonly promotionsUrl = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json';

    async getVersions(project: string): Promise<string[]> {
        // Forge doesn't have a simple "list all versions" API that is clean.
        // We can infer from promotions or just return a list of known MC versions if we had them.
        // For now, let's fetch promotions and extract MC versions from keys like "1.20.1-latest"
        const response = await fetch(this.promotionsUrl);
        if (!response.ok) throw new Error('Failed to fetch forge promotions');
        const data = await response.json();
        const parsed = ForgePromotionsSchema.parse(data);

        const versions = new Set<string>();
        Object.keys(parsed.promos).forEach(key => {
            const match = key.match(/^(.+)-(latest|recommended)$/);
            if (match && match[1]) {
                versions.add(match[1]);
            }
        });
        return Array.from(versions).sort(); // Basic sort
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        const response = await fetch(this.promotionsUrl);
        if (!response.ok) throw new Error('Failed to fetch forge promotions');
        const data = await response.json();
        const parsed = ForgePromotionsSchema.parse(data);

        const latestKey = `${version}-latest`;
        const recommendedKey = `${version}-recommended`;

        const forgeVersion = parsed.promos[recommendedKey] || parsed.promos[latestKey];
        if (!forgeVersion) throw new Error(`No forge version found for ${version}`);

        // URL construction: https://maven.minecraftforge.net/net/minecraftforge/forge/{version}-{forgeVersion}/forge-{version}-{forgeVersion}-installer.jar
        // Note: Older versions might use -universal.jar, but modern is installer.
        // We will assume installer for now.
        const downloadUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}-${forgeVersion}/forge-${version}-${forgeVersion}-installer.jar`;

        return [{
            core: 'forge',
            version: version,
            buildId: forgeVersion,
            timestamp: new Date(),
            downloads: {
                application: {
                    name: `forge-${version}-${forgeVersion}-installer.jar`,
                    url: downloadUrl,
                    downloadType: 'installer'
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
        return `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}-${buildId}/forge-${version}-${buildId}-installer.jar`;
    }
}
