import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginFormView } from './LoginFormView';

const baseProps = {
	emailId: 'email',
	passwordId: 'password',
	email: '',
	password: '',
	errorMessage: '',
	isLoading: false,
	canUseDevAdminLogin: false,
	onEmailChange: () => undefined,
	onPasswordChange: () => undefined,
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => e.preventDefault(),
	onDevAdminLogin: () => undefined,
};

describe('LoginFormView', () => {
	it('renders the email + password fields and the login button', () => {
		const { getByLabelText, getByRole } = render(<LoginFormView {...baseProps} />);
		expect(getByLabelText('Email')).toBeTruthy();
		expect(getByLabelText('Password')).toBeTruthy();
		expect(getByRole('button', { name: 'Login' })).toBeTruthy();
	});

	it('renders the error alert when errorMessage is non-empty', () => {
		const { getByText } = render(
			<LoginFormView {...baseProps} errorMessage="Wrong password" />
		);
		expect(getByText('Wrong password')).toBeTruthy();
	});

	it('hides the dev-admin button when canUseDevAdminLogin is false', () => {
		const { queryByRole } = render(<LoginFormView {...baseProps} />);
		expect(queryByRole('button', { name: 'Dev Admin' })).toBeNull();
	});

	it('shows the dev-admin button when allowed and fires onDevAdminLogin', () => {
		const onDevAdminLogin = vi.fn();
		const { getByRole } = render(
			<LoginFormView {...baseProps} canUseDevAdminLogin onDevAdminLogin={onDevAdminLogin} />
		);
		fireEvent.click(getByRole('button', { name: 'Dev Admin' }));
		expect(onDevAdminLogin).toHaveBeenCalled();
	});

	it('disables submit button when isLoading is true', () => {
		const { getByRole } = render(<LoginFormView {...baseProps} isLoading />);
		expect((getByRole('button', { name: 'Login' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('fires onEmailChange/onPasswordChange when fields are typed into', () => {
		const onEmailChange = vi.fn();
		const onPasswordChange = vi.fn();
		const { getByLabelText } = render(
			<LoginFormView
				{...baseProps}
				onEmailChange={onEmailChange}
				onPasswordChange={onPasswordChange}
			/>
		);
		fireEvent.change(getByLabelText('Email'), { target: { value: 'me@x.com' } });
		fireEvent.change(getByLabelText('Password'), { target: { value: 'secret' } });
		expect(onEmailChange).toHaveBeenCalledWith('me@x.com');
		expect(onPasswordChange).toHaveBeenCalledWith('secret');
	});
});
