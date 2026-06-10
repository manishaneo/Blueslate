-- CreateTable
CREATE TABLE "BusinessContext" (
    "id" SERIAL NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessContext_pkey" PRIMARY KEY ("id")
);
