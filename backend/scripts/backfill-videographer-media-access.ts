/**
 * One-off backfill: grant every active VIDEOGRAPHER EDITOR access to every
 * existing media-collaboration project.
 *
 * Going forward this is handled automatically:
 *  - new project  → MediaProjectsService.create() auto-adds all videographers
 *  - new/promoted videographer → UsersService.syncVideographerMediaAccess()
 *
 * This script only covers projects/videographers that existed BEFORE those
 * hooks were added. It is idempotent — re-running adds nothing new.
 *
 * Run: cd backend && npx ts-node scripts/backfill-videographer-media-access.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const videographers = await prisma.user.findMany({
    where: { role: "VIDEOGRAPHER", isActive: true },
    select: { id: true, email: true },
  });
  const projects = await prisma.mediaProject.findMany({
    select: { id: true, createdBy: true },
  });

  console.log(
    `Found ${videographers.length} active videographer(s) and ${projects.length} media project(s).`,
  );
  if (videographers.length === 0 || projects.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  let added = 0;
  let skipped = 0;

  for (const vid of videographers) {
    const existing = await prisma.mediaCollaborator.findMany({
      where: { userId: vid.id, projectId: { in: projects.map((p) => p.id) } },
      select: { projectId: true },
    });
    const have = new Set(existing.map((e) => e.projectId));

    const toAdd = projects
      .filter((p) => !have.has(p.id))
      .map((p) => ({
        projectId: p.id,
        userId: vid.id,
        role: "EDITOR" as const,
        invitedBy: p.createdBy,
      }));

    skipped += have.size;
    if (toAdd.length > 0) {
      const res = await prisma.mediaCollaborator.createMany({
        data: toAdd,
        skipDuplicates: true,
      });
      added += res.count;
      console.log(
        `  ${vid.email}: +${res.count} project(s) as EDITOR (already had ${have.size}).`,
      );
    } else {
      console.log(`  ${vid.email}: already a collaborator on all projects.`);
    }
  }

  console.log(`Done. Added ${added} collaborator record(s), skipped ${skipped} existing.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
