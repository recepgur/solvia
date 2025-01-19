# Car Swipe Mobile App Testing Instructions

## Prerequisites

### Android Development
1. Android SDK with NDK 26.1.10909125
2. Accept SDK licenses:
```bash
sdkmanager --licenses
```

### iOS Development
1. XCode installed
2. CocoaPods installed:
```bash
sudo gem install cocoapods
```

## Setup Instructions

1. Install dependencies:
```bash
yarn install
```

2. iOS specific setup:
```bash
cd ios
pod install
cd ..
```

3. Start Metro bundler:
```bash
yarn start
```

4. Build and run:

For Android:
```bash
yarn android
```

For iOS:
```bash
yarn ios
```

## Testing Checklist

### Core Functionality
- [ ] App launches successfully
- [ ] Geolocation permission request appears
- [ ] Nearby car listings are loaded
- [ ] Swipe left/right functionality works
- [ ] Car details are displayed correctly
- [ ] Like/dislike actions are recorded

### Platform-Specific
#### Android
- [ ] Location permissions work correctly
- [ ] Smooth animations on swipe
- [ ] Back button handling

#### iOS
- [ ] Location permissions work correctly
- [ ] Smooth animations on swipe
- [ ] Gesture handling matches iOS standards

## Known Issues
1. Android SDK license acceptance required for local development
2. CocoaPods installation required for iOS development

## API Integration
The app is configured to use the backend API at: https://app-hbycamzu.fly.dev

## Troubleshooting
If you encounter build issues:
1. Ensure all SDK licenses are accepted
2. Clean build folders:
   ```bash
   cd android && ./gradlew clean
   cd ios && xcodebuild clean
   ```
3. Reset Metro cache:
   ```bash
   yarn start --reset-cache
   ```
