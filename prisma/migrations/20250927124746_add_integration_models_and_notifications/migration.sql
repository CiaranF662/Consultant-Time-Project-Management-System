-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PROJECT_ASSIGNMENT', 'HOUR_CHANGE_REQUEST', 'HOUR_CHANGE_APPROVED', 'HOUR_CHANGE_REJECTED', 'PHASE_DEADLINE_WARNING', 'USER_APPROVAL_NEEDED', 'OVERDUE_APPROVAL_ALERT');

-- AlterEnum
ALTER TYPE "public"."UserStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "public"."PhaseAllocation" ADD COLUMN     "consultantDescription" TEXT;

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JiraIssue" (
    "id" TEXT NOT NULL,
    "jiraKey" TEXT NOT NULL,
    "agileRsTaskId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jiraProjectKey" TEXT,
    "jiraEpicKey" TEXT,
    "slackChannelId" TEXT,
    "slackChannelName" TEXT,
    "googleDriveFolder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskIntegration" (
    "id" TEXT NOT NULL,
    "internalTaskId" TEXT NOT NULL,
    "jiraIssueKey" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhaseMeeting" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "googleEventId" TEXT,
    "meetingUrl" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jiraEmail" TEXT,
    "jiraApiToken" TEXT,
    "slackUserId" TEXT,
    "googleRefreshToken" TEXT,
    "notificationSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "public"."Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JiraIssue_jiraKey_key" ON "public"."JiraIssue"("jiraKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectIntegration_projectId_key" ON "public"."ProjectIntegration"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskIntegration_jiraIssueKey_key" ON "public"."TaskIntegration"("jiraIssueKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSettings_userId_key" ON "public"."IntegrationSettings"("userId");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectIntegration" ADD CONSTRAINT "ProjectIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskIntegration" ADD CONSTRAINT "TaskIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhaseMeeting" ADD CONSTRAINT "PhaseMeeting_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationSettings" ADD CONSTRAINT "IntegrationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
