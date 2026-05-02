import ChatContainer from '@/features/chat/ChatContainer';
import { OnboardingModal } from '@/features/onboarding/OnboardingModal';

/**
 * Root conversation page (`/`).
 *
 * Generates a fresh UUID on each render so the {@link ChatContainer} starts
 * with a blank slate. The `key` prop ensures React fully remounts the
 * component when navigating back here from an existing conversation.
 */
export default async function ConversationPage() {
  const uuid: string = crypto.randomUUID();

  return (
    <div>
      <OnboardingModal />
      <ChatContainer key={uuid} conversationId={uuid} />
    </div>
  );
}
