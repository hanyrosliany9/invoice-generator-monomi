import {
  MediaAsset,
  MediaProject,
  MediaCollaborator,
  MediaVersion,
  User,
} from "@prisma/client";

/**
 * Prisma Extended Types
 *
 * Properly typed Prisma query results with includes.
 * Use these instead of `as any` when dealing with Prisma relations.
 */

export type MediaAssetWithProject = MediaAsset & {
  project: MediaProject & {
    collaborators: MediaCollaborator[];
  };
  uploader: Pick<User, "id" | "name" | "email">;
  metadata?: any; // AssetMetadata is stored as JSON
};

export type MediaAssetWithVersions = MediaAsset & {
  project: MediaProject & {
    collaborators: MediaCollaborator[];
  };
  versions: Array<
    MediaVersion & {
      uploader: Pick<User, "id" | "name" | "email">;
    }
  >;
};

export type MediaProjectWithCollaborators = MediaProject & {
  collaborators: MediaCollaborator[];
};
