import { z } from 'zod';

export const ServerCoreSchema = z.enum(['paper', 'purpur', 'magma', 'mohist', 'velocity', 'folia', 'waterfall', 'vanilla', 'fabric', 'forge']);
export type ServerCore = z.infer<typeof ServerCoreSchema>;

export const DownloadArtifactSchema = z.object({
    name: z.string(),
    url: z.string(),
    hash: z.string().optional(),
    hashType: z.enum(['sha256', 'md5', 'sha1']).optional(),
    size: z.number().optional(),
    downloadType: z.enum(['binary', 'path', 'installer']).default('binary'),
});
export type DownloadArtifact = z.infer<typeof DownloadArtifactSchema>;

export const UnifiedBuildSchema = z.object({
    core: ServerCoreSchema,
    version: z.string(),
    buildId: z.string(),
    downloads: z.object({
        application: DownloadArtifactSchema,
    }),
    timestamp: z.date().optional(),
});
export type UnifiedBuild = z.infer<typeof UnifiedBuildSchema>;

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

// PaperMC Specific Schemas
export const PaperBuildResponseSchema = z.object({
    build: z.number(),
    time: z.string().datetime(),
    channel: z.enum(['default', 'experimental']),
    promoted: z.boolean(),
    changes: z.array(z.object({
        commit: z.string(),
        summary: z.string(),
        message: z.string()
    })).optional(),
    downloads: z.object({
        application: z.object({
            name: z.string(),
            sha256: z.string()
        })
    })
});
export type PaperBuildResponse = z.infer<typeof PaperBuildResponseSchema>;

export const PaperVersionsResponseSchema = z.object({
    project_id: z.string(),
    project_name: z.string(),
    version_groups: z.array(z.string()),
    versions: z.array(z.string())
});

export const PaperBuildsResponseSchema = z.object({
    project_id: z.string(),
    project_name: z.string(),
    version: z.string(),
    builds: z.array(PaperBuildResponseSchema)
});
