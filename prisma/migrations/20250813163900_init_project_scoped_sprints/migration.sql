/*
  Warnings:

  - You are about to drop the column `name` on the `Sprint` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectId,sprintNumber]` on the table `Sprint` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectId` to the `Sprint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sprintNumber` to the `Sprint` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Sprint_endDate_key";

-- DropIndex
DROP INDEX "public"."Sprint_startDate_key";

-- AlterTable
ALTER TABLE "public"."Sprint" DROP COLUMN "name",
ADD COLUMN     "phaseId" TEXT,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "sprintNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_projectId_sprintNumber_key" ON "public"."Sprint"("projectId", "sprintNumber");

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
