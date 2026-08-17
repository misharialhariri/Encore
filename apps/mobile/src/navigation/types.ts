export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phoneNumber: string };
};

export type OnboardingStackParamList = {
  ProfileSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Sell: undefined;
  Chat: undefined;
  Profile: undefined;
};

// Shared across every tab's stack so a single ListingDetailScreen /
// ResellerProfileScreen component can be pushed from Home, Search, Sell,
// or the wishlist — each tab registers its own copy of these two routes.
export type SharedListingRoutes = {
  ListingDetail: { listingId: string };
  ResellerProfile: { resellerId: string };
};

export type SellStackParamList = SharedListingRoutes & {
  Dashboard: undefined;
  ListingForm: { listingId?: string } | undefined;
};

export type HomeStackParamList = SharedListingRoutes & {
  Feed: undefined;
};

export type SearchStackParamList = SharedListingRoutes & {
  SearchResults: undefined;
};

export type ProfileStackParamList = SharedListingRoutes & {
  ProfileHome: undefined;
  Wishlist: undefined;
};
