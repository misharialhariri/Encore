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

// Shared across every tab's stack so a single set of screen components
// (listing detail, reseller profile, offer thread, checkout, order detail)
// can be pushed from Home, Search, Sell, or Profile — each tab registers
// its own copy of these routes pointing at the same components.
export type SharedListingRoutes = {
  ListingDetail: { listingId: string };
  ResellerProfile: { resellerId: string };
  OfferThread: { offerId: string };
  Checkout: { listingId: string; offerId?: string };
  OrderConfirmation: { orderId: string };
  OrderDetail: { orderId: string };
  Conversation: { conversationId: string };
};

export type SellStackParamList = SharedListingRoutes & {
  Dashboard: undefined;
  ListingForm: { listingId?: string } | undefined;
  OffersReceived: undefined;
  Sales: undefined;
  Payouts: undefined;
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
  MyOffers: undefined;
  MyOrders: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  Verification: undefined;
};

export type ChatStackParamList = SharedListingRoutes & {
  ChatList: undefined;
};
