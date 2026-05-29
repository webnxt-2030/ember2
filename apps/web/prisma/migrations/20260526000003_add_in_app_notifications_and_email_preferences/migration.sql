-- Add InAppNotification and EmailPreference tables
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InAppNotification_userId_idx" ON "InAppNotification"("userId");
CREATE INDEX "InAppNotification_userId_readAt_idx" ON "InAppNotification"("userId", "readAt");
CREATE INDEX "InAppNotification_createdAt_idx" ON "InAppNotification"("createdAt");

ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "template" "EmailTemplate" NOT NULL,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailPreference_userId_template_key" ON "EmailPreference"("userId", "template");
CREATE INDEX "EmailPreference_userId_idx" ON "EmailPreference"("userId");

ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
