/**
 * Tasks route (`/tasks`).
 *
 * Mounts the client {@link TasksContainer} inside the `_app` layout's
 * existing chrome.  No backend integration yet — see feature module.
 */

import { createFileRoute } from '@tanstack/react-router';
import { TasksContainer } from '@/features/tasks/TasksContainer';

export const Route = createFileRoute('/_app/tasks')({
	component: () => <TasksContainer />,
});
