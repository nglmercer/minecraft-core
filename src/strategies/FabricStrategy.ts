import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';
import { z } from 'zod';

const FabricGameVersionsSchema = z.array(z.object({
    version: z.string(),
    stable: z.boolean()
}));

const FabricLoaderVersionsSchema = z.array(z.object({
    version: z.string(),
    stable: z.boolean()
}));

const FabricInstallerVersionsSchema = z.array(z.object({
    version: z.string(),
    stable: z.boolean()
}));

export class FabricStrategy implements CoreStrategy {
    readonly name = 'Fabric';
    readonly baseUrl = 'https://meta.fabricmc.net/v2';

    async getVersions(project: string): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/versions/game`);
        if (!response.ok) throw new Error('Failed to fetch fabric game versions');
        const data = await response.json();
        const parsed = FabricGameVersionsSchema.parse(data);
        return parsed.map(v => v.version);
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        // Fetch loaders
        const loaderRes = await fetch(`${this.baseUrl}/versions/loader`);
        if (!loaderRes.ok) throw new Error('Failed to fetch fabric loader versions');
        const loaderData = await loaderRes.json();
        const loaders = FabricLoaderVersionsSchema.parse(loaderData);

        // Pick the latest stable loader
        const stableLoader = loaders.find(l => l.stable) || loaders[0];
        if (!stableLoader) throw new Error('No fabric loader found');

        // Fetch installers
        const installerRes = await fetch(`${this.baseUrl}/versions/installer`);
        if (!installerRes.ok) throw new Error('Failed to fetch fabric installer versions');
        const installerData = await installerRes.json();
        const installers = FabricInstallerVersionsSchema.parse(installerData);

        const stableInstaller = installers.find(i => i.stable) || installers[0];
        if (!stableInstaller) throw new Error('No fabric installer found');

        // URL to download server jar (launcher)
        // https://meta.fabricmc.net/v2/versions/loader/{game_version}/{loader_version}/{installer_version}/server/jar
        const downloadUrl = `${this.baseUrl}/versions/loader/${version}/${stableLoader.version}/${stableInstaller.version}/server/jar`;

        return [{
            core: 'fabric',
            version: version,
            buildId: stableLoader.version, // Using loader version as build ID
            timestamp: new Date(),
            downloads: {
                application: {
                    name: `fabric-server-mc.${version}-loader.${stableLoader.version}-launcher.jar`,
                    url: downloadUrl,
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
        // This method signature is a bit restrictive for Fabric since we need installer version too.
        // But getBuilds handles it.
        return '';
    }
}
