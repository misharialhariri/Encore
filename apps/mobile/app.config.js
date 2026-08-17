module.exports = {
  expo: {
    name: "Encore",
    slug: "encore",
    scheme: "encore",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.encore.app",
      usesAppleSignIn: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || undefined,
      },
      infoPlist: {
        NSFaceIDUsageDescription: "Encore uses Face ID to let you sign back in quickly and securely.",
        NSPhotoLibraryUsageDescription:
          "Encore needs access to your photos so you can upload a profile picture and dress listing photos.",
        NSCameraUsageDescription:
          "Encore needs access to your camera so you can take photos for your profile and dress listings.",
      },
    },
    android: {
      package: "com.encore.app",
      permissions: ["USE_BIOMETRIC", "USE_FINGERPRINT"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || undefined,
        },
      },
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Encore uses Face ID to let you sign back in quickly and securely.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Encore needs access to your photos so you can upload a profile picture and dress listing photos.",
        },
      ],
    ],
  },
};
