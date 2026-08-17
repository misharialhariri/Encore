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

export type SellStackParamList = {
  Dashboard: undefined;
  ListingForm: { listingId?: string } | undefined;
  ListingPreview: { listingId: string };
  ResellerProfile: { resellerId: string };
};
