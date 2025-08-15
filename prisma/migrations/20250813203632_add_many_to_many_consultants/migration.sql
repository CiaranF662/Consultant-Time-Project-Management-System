/*
  Warnings:

  - You are about to drop the column `consultantId` on the `Project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Project" DROP CONSTRAINT "Project_consultantId_fkey";

-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "consultantId";

-- CreateTable
CREATE TABLE "public"."ConsultantsOnProjects" (
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultantsOnProjects_pkey" PRIMARY KEY ("userId","projectId")
);

-- AddForeignKey
ALTER TABLE "public"."ConsultantsOnProjects" ADD CONSTRAINT "ConsultantsOnProjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultantsOnProjects" ADD CONSTRAINT "ConsultantsOnProjects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
