import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from './tool';

describe('Tool', () => {
	it('renders header title + state + content', () => {
		const { getByText, container } = render(
			<Tool defaultOpen>
				<ToolHeader state="output-available" type="search" title="search-web" />
				<ToolContent>
					<ToolInput input={{ query: 'foo' }} />
					<ToolOutput errorText={null} output={'result'} />
				</ToolContent>
			</Tool>
		);
		expect(getByText('search-web')).toBeTruthy();
		expect(getByText('Parameters')).toBeTruthy();
		expect(container.querySelector('[data-state="open"]')).toBeTruthy();
	});

	it('renders the error path when errorText is supplied', () => {
		const { getByText } = render(
			<Tool defaultOpen>
				<ToolContent>
					<ToolOutput errorText="boom" output={null} />
				</ToolContent>
			</Tool>
		);
		expect(getByText(/boom/)).toBeTruthy();
	});
});
