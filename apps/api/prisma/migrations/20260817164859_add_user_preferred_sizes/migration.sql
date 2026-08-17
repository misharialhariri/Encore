-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferred_sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];
