export type ServerCore = 'paper' | 'purpur' | 'magma' | 'mohist' | 'velocity' | 'folia' | 'waterfall' | 'vanilla' | 'fabric' | 'forge' | 'arclight';

export interface DownloadArtifact {
    name: string;
    url: string;
    hash?: string;
    hashType?: 'sha256' | 'md5' | 'sha1';
    size?: number;
    downloadType: 'binary' | 'path' | 'installer';
}

export interface UnifiedBuild {
    core: ServerCore;
    version: string;
    buildId: string;
    downloads: {
        application: DownloadArtifact;
    };
    timestamp?: Date;
}

export interface DownloadOptions {
    core: ServerCore;
    version: string;
    buildId?: string; // If not provided, fetch latest
    outputDir: string;
    filename?: string;
}

export interface DownloadResult {
    path: string;
    filename: string;
    size: number;
    hash: string;
    downloadType: 'binary' | 'path' | 'installer';
}

// PaperMC Specific Types
export interface PaperBuildResponse {
    build: number;
    time: string;
    channel: 'default' | 'experimental';
    promoted: boolean;
    changes?: {
        commit: string;
        summary: string;
        message: string;
    }[];
    downloads: {
        application: {
            name: string;
            sha256: string;
        };
    };
}

export interface PaperVersionsResponse {
    project_id: string;
    project_name: string;
    version_groups: string[];
    versions: string[];
}

export interface PaperBuildsResponse {
    project_id: string;
    project_name: string;
    version: string;
    builds: PaperBuildResponse[];
}
