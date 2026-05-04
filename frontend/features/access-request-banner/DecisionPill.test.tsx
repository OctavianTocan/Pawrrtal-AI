import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DecisionPill } from './DecisionPill';

const noop = (): void => {
	/* */
};

describe('DecisionPill', () => {
	it('renders Approve + Reject affordances in the undecided state', () => {
		const { getByText } = render(
			<DecisionPill
				decision="undecided"
				onApprove={noop}
				onReject={noop}
				onReset={noop}
				pillId="p1"
			/>
		);
		expect(getByText('Approve')).toBeTruthy();
		expect(getByText('Reject')).toBeTruthy();
	});

	it('flips the approve label to "Approved" once the approved decision lands', () => {
		const { getByText } = render(
			<DecisionPill
				decision="approved"
				onApprove={noop}
				onReject={noop}
				onReset={noop}
				pillId="p1"
			/>
		);
		expect(getByText('Approved')).toBeTruthy();
	});

	it('fires onApprove when the approve side is clicked from undecided', () => {
		const onApprove = vi.fn();
		const { getByText } = render(
			<DecisionPill
				decision="undecided"
				onApprove={onApprove}
				onReject={noop}
				onReset={noop}
				pillId="p1"
			/>
		);
		fireEvent.click(getByText('Approve'));
		expect(onApprove).toHaveBeenCalled();
	});

	it('fires onReset when the active approved side is clicked again', () => {
		const onReset = vi.fn();
		const { getByText } = render(
			<DecisionPill
				decision="approved"
				onApprove={noop}
				onReject={noop}
				onReset={onReset}
				pillId="p1"
			/>
		);
		fireEvent.click(getByText('Approved'));
		expect(onReset).toHaveBeenCalled();
	});

	it('fires onReject when the reject side is clicked from undecided', () => {
		const onReject = vi.fn();
		const { getByText } = render(
			<DecisionPill
				decision="undecided"
				onApprove={noop}
				onReject={onReject}
				onReset={noop}
				pillId="p1"
			/>
		);
		fireEvent.click(getByText('Reject'));
		expect(onReject).toHaveBeenCalled();
	});
});
