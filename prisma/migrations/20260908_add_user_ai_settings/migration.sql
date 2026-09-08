-- CreateTable UserAiSettings for BYOK
CREATE TABLE "user_ai_settings" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "encrypted_api_key" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_ai_settings_user_id_key" ON "user_ai_settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_ai_settings" ADD CONSTRAINT "user_ai_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
