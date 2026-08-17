import { prisma } from "../config/prisma";

/**
 * Phase 2's slice of listing moderation: a banned-keyword scan against the
 * title/description. A hit keeps the listing in PENDING_REVIEW instead of
 * auto-activating it; the manual review queue and AI image check are built
 * out in Phase 6 (Trust & Safety) on top of this same gate.
 */
export async function containsBannedKeyword(text: string): Promise<boolean> {
  const keywords = await prisma.bannedKeyword.findMany();
  if (keywords.length === 0) return false;

  const haystack = text.toLowerCase();
  return keywords.some((k) => haystack.includes(k.keyword.toLowerCase()));
}
