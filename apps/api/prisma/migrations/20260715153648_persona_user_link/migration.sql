-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Persona_userId_idx" ON "Persona"("userId");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
