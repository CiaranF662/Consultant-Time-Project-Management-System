-- DropForeignKey
ALTER TABLE "public"."ConsultantSprintHours" DROP CONSTRAINT "ConsultantSprintHours_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsultantsOnProjects" DROP CONSTRAINT "ConsultantsOnProjects_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsultantsOnProjects" DROP CONSTRAINT "ConsultantsOnProjects_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sprint" DROP CONSTRAINT "Sprint_phaseId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."Phase"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ConsultantsOnProjects" ADD CONSTRAINT "ConsultantsOnProjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultantsOnProjects" ADD CONSTRAINT "ConsultantsOnProjects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultantSprintHours" ADD CONSTRAINT "ConsultantSprintHours_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
