// Component layer (stateful) — default import for most consumers
export { AccessRequestBanner } from "./access-request-banner";

// View layer (stateless) — exported for Storybook stories and isolated tests
export { AccessRequestBannerView } from "./access-request-banner-view";

export type {
	AccessRequest,
	AccessRequestBannerProps,
	AccessRequestBannerViewProps,
} from "./types";
