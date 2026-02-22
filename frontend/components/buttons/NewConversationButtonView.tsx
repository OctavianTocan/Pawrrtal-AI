'use client';
import type { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface NewConversationButtonProps {
  handleNewConversation: () => void;
  createConversationMutation: UseMutationResult<any, any, any, any>;
}

export default function NewConversationButtonView({ handleNewConversation, createConversationMutation
}: NewConversationButtonProps) {
  return (
    <Button
      className="w-50 mx-auto cursor-pointer h-10"
      onClick={handleNewConversation}
      disabled={!createConversationMutation.isIdle}
    >
      {createConversationMutation.isIdle
        ? "New Conversation"
        : "Creating Conversation..."}
    </Button>
  );
}
