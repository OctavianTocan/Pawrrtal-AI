import { type QueryKey, useQuery } from "@tanstack/react-query";
import { useAuthedFetch } from "./use-authed-fetch";

// This hook is a wrapper around useQuery that automatically includes the session token in the request and handles 401 errors by redirecting to the login page.
// It allows us to cache API responses using React Query while ensuring that the user is authenticated.
export function useAuthedQuery<T>(queryKey: QueryKey, endpoint: string) {
	const authedFetch = useAuthedFetch();
	return useQuery<T>({
		queryKey,
		queryFn: async () => {
			const response = await authedFetch(endpoint);
			return response.json();
		},
	});
}
