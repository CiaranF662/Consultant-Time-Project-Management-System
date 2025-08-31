/*
  Warnings:

  - You are about to drop the column `projectId` on the `HourChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `sprintId` on the `HourChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `expectedHours` on the `Sprint` table. All the data in the column will be lost.
  - You are about to drop the `ConsultantSprintHours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `changeType` to the `HourChangeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ChangeType" AS ENUM ('ADJUSTMENT', 'SHIFT');

-- CreateEnum
CREATE TYPE "public"."ProjectRole" AS ENUM ('PRODUCT_MANAGER', 'TEAM_MEMBER');

-- DropForeignKey
ALTER TABLE "public"."ConsultantSprintHours" DROP CONSTRAINT "ConsultantSprintHours_consultantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsultantSprintHours" DROP CONSTRAINT "ConsultantSprintHours_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsultantSprintHours" DROP CONSTRAINT "ConsultantSprintHours_sprintId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HourChangeRequest" DROP CONSTRAINT "HourChangeRequest_sprintId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_sprintId_fkey";

-- AlterTable
ALTER TABLE "public"."ConsultantsOnProjects" ADD COLUMN     "role" "public"."ProjectRole" NOT NULL DEFAULT 'TEAM_MEMBER';

-- AlterTable
ALTER TABLE "public"."HourChangeRequest" DROP COLUMN "projectId",
DROP COLUMN "sprintId",
ADD COLUMN     "changeType" "public"."ChangeType" NOT NULL,
ADD COLUMN     "fromConsultantId" TEXT,
ADD COLUMN     "phaseAllocationId" TEXT,
ADD COLUMN     "phaseId" TEXT,
ADD COLUMN     "shiftHours" DOUBLE PRECISION,
ADD COLUMN     "toConsultantId" TEXT,
ADD COLUMN     "year" INTEGER,
ALTER COLUMN "weekNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "budgetedHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "productManagerId" TEXT;

-- AlterTable
ALTER TABLE "public"."Sprint" DROP COLUMN "expectedHours";

-- DropTable
DROP TABLE "public"."ConsultantSprintHours";

-- DropTable
DROP TABLE "public"."Task";

-- DropEnum
DROP TYPE "public"."TaskStatus";

-- CreateTable
CREATE TABLE "public"."PhaseAllocation" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyAllocation" (
    "id" TEXT NOT NULL,
    "phaseAllocationId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "plannedHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhaseAllocation_phaseId_consultantId_key" ON "public"."PhaseAllocation"("phaseId", "consultantId");

-- CreateIndex
CREATE INDEX "WeeklyAllocation_consultantId_weekStartDate_idx" ON "public"."WeeklyAllocation"("consultantId", "weekStartDate");

-- CreateIndex
CREATE INDEX "WeeklyAllocation_weekStartDate_idx" ON "public"."WeeklyAllocation"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAllocation_phaseAllocationId_weekNumber_year_key" ON "public"."WeeklyAllocation"("phaseAllocationId", "weekNumber", "year");

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_productManagerId_fkey" FOREIGN KEY ("productManagerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhaseAllocation" ADD CONSTRAINT "PhaseAllocation_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhaseAllocation" ADD CONSTRAINT "PhaseAllocation_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyAllocation" ADD CONSTRAINT "WeeklyAllocation_phaseAllocationId_fkey" FOREIGN KEY ("phaseAllocationId") REFERENCES "public"."PhaseAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyAllocation" ADD CONSTRAINT "WeeklyAllocation_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
