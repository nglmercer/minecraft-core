import type { CoreStrategy } from './CoreStrategy';
import type { UnifiedBuild } from '../types';

export class MagmaStrategy implements CoreStrategy {
    readonly name = 'MagmaFoundation';
    readonly baseUrl = 'https://api.magmafoundation.org/api/v2';

    async getVersions(project: string): Promise<string[]> {
        throw new Error('Magma strategy not yet fully implemented due to API instability.');
    }

    async getBuilds(project: string, version: string): Promise<UnifiedBuild[]> {
        throw new Error('Magma strategy not yet fully implemented due to API instability.');
    }

    async getLatestBuild(project: string, version: string): Promise<UnifiedBuild> {
        throw new Error('Magma strategy not yet fully implemented due to API instability.');
    }

    async getDownloadUrl(project: string, version: string, buildId: string, fileName: string): Promise<string> {
        throw new Error('Magma strategy not yet fully implemented due to API instability.');
    }
}
