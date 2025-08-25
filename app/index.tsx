import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // This component serves as a loading screen
  // Navigation is handled by the root layout
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}


