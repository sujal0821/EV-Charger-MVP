import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useProfile } from '@/hooks/useProfile';
import { showError } from '@/utils/alerts';

type RoleGuardProps = {
  children: React.ReactNode;
  requiredRole: 'admin' | 'host' | 'customer';
  requireHostApproval?: boolean;
  fallbackRoute?: string;
  fallbackMessage?: string;
};

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRole,
  requireHostApproval = false,
  fallbackRoute = '/(tabs)/explore',
  fallbackMessage,
}) => {
  const { profile, loading, isAdmin, isHost, isHostPending, isCustomer } = useProfile();

  useEffect(() => {
    if (loading) return;

    let hasAccess = false;
    let message = fallbackMessage;

    switch (requiredRole) {
      case 'admin':
        hasAccess = isAdmin;
        message = message || 'Admin access required';
        break;
      case 'host':
        hasAccess = isHost && (!requireHostApproval || profile?.host_approved);
        message = message || (isHostPending ? 'Host access pending approval' : 'Host access required');
        break;
      case 'customer':
        hasAccess = isCustomer || isHost || isAdmin;
        message = message || 'Authentication required';
        break;
    }

    if (!hasAccess) {
      showError(message);
      router.replace(fallbackRoute as any);
    }
  }, [profile, loading, requiredRole, requireHostApproval, fallbackRoute, fallbackMessage, isAdmin, isHost, isHostPending, isCustomer]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check access again for render
  let hasAccess = false;
  switch (requiredRole) {
    case 'admin':
      hasAccess = isAdmin;
      break;
    case 'host':
      hasAccess = isHost && (!requireHostApproval || profile?.host_approved);
      break;
    case 'customer':
      hasAccess = isCustomer || isHost || isAdmin;
      break;
  }

  if (!hasAccess) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
