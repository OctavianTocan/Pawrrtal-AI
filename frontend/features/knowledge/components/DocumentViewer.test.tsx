'use client';

/**
 * Tests for DocumentViewer.
 *
 * Critical paths covered:
 *  - Read mode: markdown rendered, Edit button visible when onSave provided
 *  - Edit mode entry: textarea seeded from `markdown` prop, "editing" badge visible
 *  - Cancel: exits edit mode without calling onSave
 *  - Save: calls onSave with current draft; shows spinner; exits on success
 *  - Save error: shows error banner, stays in edit mode
 *  - CRITICAL — draft-wipe regression guard: changing the `markdown` prop
 *    while editing must NOT overwrite in-progress edits (the useRef fix)
 *  - onClose: fires when the X button is clicked
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentViewer } from './DocumentViewer';

// ---------------------------------------------------------------------------
// Helpers
// Note: streamdown and @octavian-tocan/react-dropdown are resolved by
// vitest.config.ts aliases to __mocks__ stubs — no vi.mock() needed here.
// ---------------------------------------------------------------------------

const DEFAULT_MARKDOWN = '# Hello\n\nOriginal content.';

function renderViewer(overrides: Partial<React.ComponentProps<typeof DocumentViewer>> = {}) {
	const onClose = vi.fn();
	const onSave = vi.fn<[string], Promise<void>>();

	render(
		<DocumentViewer
			filename="notes.md"
			markdown={DEFAULT_MARKDOWN}
			onClose={onClose}
			onSave={onSave}
			{...overrides}
		/>
	);

	return { onClose, onSave };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocumentViewer', () => {
	describe('read mode', () => {
		it('renders markdown content via Streamdown', () => {
			renderViewer();
			expect(screen.getByTestId('streamdown').textContent).toBe(DEFAULT_MARKDOWN);
		});

		it('shows the filename in the header', () => {
			renderViewer();
			expect(screen.getByText('notes.md')).toBeTruthy();
		});

		it('shows the Edit button when onSave is provided', () => {
			renderViewer();
			expect(screen.getByRole('button', { name: /Edit/i })).toBeTruthy();
		});

		it('does NOT show the Edit button when onSave is omitted', () => {
			renderViewer({ onSave: undefined });
			expect(screen.queryByRole('button', { name: /Edit/i })).toBeNull();
		});

		it('calls onClose when the X button is clicked', () => {
			const { onClose } = renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Close document/i }));
			expect(onClose).toHaveBeenCalled();
		});
	});

	describe('edit mode entry', () => {
		it('shows the textarea after clicking Edit', () => {
			renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			expect(screen.getByRole('textbox')).toBeTruthy();
		});

		it('seeds the textarea with the current markdown prop on entry', () => {
			renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
				DEFAULT_MARKDOWN
			);
		});

		it('shows the "editing" badge when in edit mode', () => {
			renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			expect(screen.getByText('editing')).toBeTruthy();
		});

		it('hides Streamdown and shows the textarea in edit mode', () => {
			renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			expect(screen.queryByTestId('streamdown')).toBeNull();
			expect(screen.getByRole('textbox')).toBeTruthy();
		});
	});

	describe('cancel', () => {
		it('exits edit mode without calling onSave', () => {
			const { onSave } = renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			fireEvent.change(screen.getByRole('textbox'), {
				target: { value: 'half-finished edit' },
			});
			fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
			expect(onSave).not.toHaveBeenCalled();
			// Back in read mode: Streamdown visible, textarea gone.
			expect(screen.getByTestId('streamdown')).toBeTruthy();
			expect(screen.queryByRole('textbox')).toBeNull();
		});
	});

	describe('save — success', () => {
		it('calls onSave with the current draft content', async () => {
			const { onSave } = renderViewer();
			onSave.mockResolvedValue(undefined);

			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			fireEvent.change(screen.getByRole('textbox'), {
				target: { value: '# Updated content' },
			});
			fireEvent.click(screen.getByRole('button', { name: /Save/i }));

			await waitFor(() => expect(onSave).toHaveBeenCalledWith('# Updated content'));
		});

		it('exits edit mode on successful save', async () => {
			renderViewer();
			const { onSave } = { onSave: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined) };
			const { unmount } = render(
				<DocumentViewer
					filename="notes.md"
					markdown={DEFAULT_MARKDOWN}
					onClose={vi.fn()}
					onSave={onSave}
				/>
			);

			fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]!);
			fireEvent.click(screen.getAllByRole('button', { name: /Save/i })[0]!);

			await waitFor(() => expect(screen.queryAllByRole('textbox').length).toBe(0));
			unmount();
		});
	});

	describe('save — error', () => {
		it('shows the error banner when onSave rejects', async () => {
			const { onSave } = renderViewer();
			onSave.mockRejectedValue(new Error('Network timeout'));

			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			fireEvent.click(screen.getByRole('button', { name: /Save/i }));

			await waitFor(() => expect(screen.getByText(/Network timeout/i)).toBeTruthy());
		});

		it('stays in edit mode after a save failure', async () => {
			const { onSave } = renderViewer();
			onSave.mockRejectedValue(new Error('500'));

			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			fireEvent.click(screen.getByRole('button', { name: /Save/i }));

			await waitFor(() => expect(screen.getByText(/500/i)).toBeTruthy());
			// Still in edit mode
			expect(screen.getByRole('textbox')).toBeTruthy();
		});

		it('shows a generic message when the error is not an Error instance', async () => {
			const { onSave } = renderViewer();
			onSave.mockRejectedValue('string error');

			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			fireEvent.click(screen.getByRole('button', { name: /Save/i }));

			await waitFor(() => expect(screen.getByText(/Save failed/i)).toBeTruthy());
		});
	});

	describe('draft-wipe regression (useRef guard)', () => {
		it('does NOT overwrite an in-progress draft when the markdown prop updates', async () => {
			/**
			 * This is the critical regression test for the useRef fix.
			 *
			 * Scenario:
			 *  1. User opens edit mode → draft seeded from `markdown` prop
			 *  2. User types new content
			 *  3. Parent re-renders with a new `markdown` prop (e.g. background refetch)
			 *  4. The draft must stay as the user typed it — NOT overwrite with the prop
			 */
			const { rerender } = render(
				<DocumentViewer
					filename="notes.md"
					markdown="Version 1"
					onClose={vi.fn()}
					onSave={vi.fn()}
				/>
			);

			// Enter edit mode — draft seeded as "Version 1"
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Version 1');

			// User types new content
			fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My edits so far' } });
			expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
				'My edits so far'
			);

			// Parent updates the markdown prop (background refetch) — this is
			// what triggered the bug before the useRef fix.
			await act(async () => {
				rerender(
					<DocumentViewer
						filename="notes.md"
						markdown="Version 2 from server"
						onClose={vi.fn()}
						onSave={vi.fn()}
					/>
				);
			});

			// The draft must NOT have been overwritten by the new prop.
			expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
				'My edits so far'
			);
		});

		it('seeds the draft from the latest prop when entering edit mode fresh', () => {
			/**
			 * If isEditing was false and the markdown prop updates, then the user
			 * clicks Edit — the draft should be seeded from the *new* prop, not
			 * the stale one that was current when the component mounted.
			 */
			const { rerender } = render(
				<DocumentViewer
					filename="notes.md"
					markdown="Version 1"
					onClose={vi.fn()}
					onSave={vi.fn()}
				/>
			);

			// Update prop while still in read mode
			rerender(
				<DocumentViewer
					filename="notes.md"
					markdown="Version 2"
					onClose={vi.fn()}
					onSave={vi.fn()}
				/>
			);

			// Now enter edit mode — should see Version 2
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Version 2');
		});
	});

	describe('textarea CSS', () => {
		it('applies minHeight style instead of a rows attribute', () => {
			renderViewer();
			fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
			const textarea = screen.getByRole('textbox');
			// Must NOT have a rows attribute (the old perf-bug approach)
			expect(textarea.hasAttribute('rows')).toBe(false);
			// Must have inline minHeight (the fixed approach)
			expect((textarea as HTMLTextAreaElement).style.minHeight).toBe('480px');
		});
	});
});
