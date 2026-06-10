-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "businessContextId" INTEGER NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "interest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessContextId_fkey" FOREIGN KEY ("businessContextId") REFERENCES "BusinessContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
