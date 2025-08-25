import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Alert } from 'react-native';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireHost?: boolean;
}

export default function AuthGuard({ children, requireAuth = true, requireHost = false }: AuthGuardProps) {
  const { session, profile, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure component is fully mounted before attempting navigation
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return; // Wait for both mounting and auth state

    // Check authentication
    if (requireAuth && !session) {
      // Use setTimeout to ensure navigation happens after render
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 0);
      return;
    }

    // Check host role if required
    if (requireHost && profile?.role !== 'host') {
      Alert.alert(
        'Access Denied',
        'Only hosts can access this area. Would you like to become a host?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Become Host', onPress: () => {
            setTimeout(() => {
              router.push('/(tabs)/explore');
            }, 0);
          }}
        ]
      );
      // Use setTimeout to ensure navigation happens after render
      setTimeout(() => {
        router.push('/(tabs)/explore');
      }, 0);
      return;
    }
  }, [session, profile, isLoading, requireAuth, requireHost, isReady]);

  if (isLoading || !isReady) {
    return null; // Show loading state
  }

  // Don't render children if redirecting
  if (requireAuth && !session) {
    return null;
  }

  if (requireHost && profile?.role !== 'host') {
    return null;
  }

  return <>{children}</>;
}
