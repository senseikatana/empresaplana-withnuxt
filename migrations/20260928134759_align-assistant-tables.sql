-- DropForeignKey
ALTER TABLE "assistant_conversations" DROP CONSTRAINT "assistant_conversations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "assistant_messages" DROP CONSTRAINT "assistant_messages_conversation_id_fkey";

-- AddForeignKey
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "assistant_conversations_user_idx" RENAME TO "assistant_conversations_user_id_updated_at_idx";

-- RenameIndex
ALTER INDEX "assistant_messages_conversation_idx" RENAME TO "assistant_messages_conversation_id_created_at_idx";
