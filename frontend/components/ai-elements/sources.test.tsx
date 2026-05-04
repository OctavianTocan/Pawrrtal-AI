import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Source, Sources, SourcesContent, SourcesTrigger } from './sources';

describe('Sources', () => {
	it('renders the trigger with the default "Used N sources" copy', () => {
		const { getByText } = render(
			<Sources>
				<SourcesTrigger count={3} />
			</Sources>
		);
		expect(getByText('Used 3 sources')).toBeTruthy();
	});

	it('renders custom trigger children when supplied', () => {
		const { getByText } = render(
			<Sources>
				<SourcesTrigger count={1}>my trigger</SourcesTrigger>
			</Sources>
		);
		expect(getByText('my trigger')).toBeTruthy();
	});

	it('renders Source links inside SourcesContent', () => {
		const { getByText } = render(
			<Sources defaultOpen>
				<SourcesTrigger count={1} />
				<SourcesContent>
					<Source href="https://example.com" title="Example" />
				</SourcesContent>
			</Sources>
		);
		expect(getByText('Example')).toBeTruthy();
	});
});
