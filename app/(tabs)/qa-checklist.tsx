import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shadows } from '@/utils/shadows';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/useAuth';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'auth' | 'ui' | 'functionality' | 'error-handling';
  status: 'pending' | 'passed' | 'failed';
}

export default function QAChecklistScreen() {
  const { profile } = useAuth();

  const checklistItems: ChecklistItem[] = [
    // Authentication
    {
      id: 'auth-1',
      title: 'Authentication Redirects',
      description: 'Logged out users are redirected to sign-in, logged in users go to tabs',
      category: 'auth',
      status: 'pending',
    },
    {
      id: 'auth-2',
      title: 'Host Role Protection',
      description: 'Non-host users cannot access /(host) routes',
      category: 'auth',
      status: 'pending',
    },
    
    // UI & UX
    {
      id: 'ui-1',
      title: 'Modern UI Design',
      description: 'Consistent spacing, typography, rounded corners, shadows',
      category: 'ui',
      status: 'pending',
    },
    {
      id: 'ui-2',
      title: 'Responsive Design',
      description: 'App works properly on both web and mobile',
      category: 'ui',
      status: 'pending',
    },
    {
      id: 'ui-3',
      title: 'Loading States',
      description: 'Spinners and skeletons shown during data loading',
      category: 'ui',
      status: 'pending',
    },
    {
      id: 'ui-4',
      title: 'Empty States',
      description: 'Helpful messages when lists are empty',
      category: 'ui',
      status: 'pending',
    },
    
    // Functionality
    {
      id: 'func-1',
      title: 'Map Loading (Device)',
      description: 'Map loads and shows chargers on mobile devices',
      category: 'functionality',
      status: 'pending',
    },
    {
      id: 'func-2',
      title: 'Web Fallback',
      description: 'Web shows appropriate fallback instead of map',
      category: 'functionality',
      status: 'pending',
    },
    {
      id: 'func-3',
      title: 'Booking Modal',
      description: 'Tapping charger opens booking modal with time pickers',
      category: 'functionality',
      status: 'pending',
    },
    {
      id: 'func-4',
      title: 'Overlap Prevention',
      description: 'System prevents overlapping bookings',
      category: 'functionality',
      status: 'pending',
    },
    {
      id: 'func-5',
      title: 'Reviews System',
      description: 'Users can only review completed bookings',
      category: 'functionality',
      status: 'pending',
    },
    
    // Error Handling
    {
      id: 'error-1',
      title: 'Location Permission',
      description: 'Shows card to enable location when permission denied',
      category: 'error-handling',
      status: 'pending',
    },
    {
      id: 'error-2',
      title: 'Network Errors',
      description: 'Non-blocking toasts with retry buttons',
      category: 'error-handling',
      status: 'pending',
    },
    {
      id: 'error-3',
      title: 'Environment Variables',
      description: 'Banner shows when EXPO_PUBLIC_* vars are missing',
      category: 'error-handling',
      status: 'pending',
    },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth': return 'shield-checkmark';
      case 'ui': return 'brush';
      case 'functionality': return 'cog';
      case 'error-handling': return 'warning';
      default: return 'help-circle';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return '#059669';
      case 'ui': return '#7C3AED';
      case 'functionality': return '#2563EB';
      case 'error-handling': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return 'checkmark-circle';
      case 'failed': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#059669';
      case 'failed': return '#DC2626';
      default: return '#9CA3AF';
    }
  };

  const toggleStatus = (itemId: string) => {
    // In a real app, this would update state
    console.log(`Toggling status for item: ${itemId}`);
  };

  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>QA Checklist</Text>
          <Text style={styles.subtitle}>
            Use this checklist to verify all app features are working correctly
          </Text>
        </View>

        {/* Authentication Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Authentication</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• User can sign up with email/password</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• User can sign in with email/password</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• User can sign out</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Unauthenticated users are redirected to sign in</Text>
          </View>
        </View>

        {/* Navigation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧭 Navigation</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Tab navigation works between Home, Bookings, Explore, QA</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Stack navigation works for auth screens</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Back navigation works properly</Text>
          </View>
        </View>

        {/* Home Screen Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏠 Home Screen</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Map placeholder displays correctly</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Charger list loads and displays</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Charger cards show correct information</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Refresh button works</Text>
          </View>
        </View>

        {/* Bookings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Bookings</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Bookings list loads correctly</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Pull to refresh works</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Cancel/delete actions work</Text>
          </View>
        </View>

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Explore</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• App info displays correctly</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Dev tools work (create mock chargers)</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Host role management works</Text>
          </View>
        </View>

        {/* Development Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ Development Tools</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Mock chargers can be created</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• User can become host</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Database status check works</Text>
          </View>
        </View>

        {/* Error Handling Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Error Handling</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Network errors are handled gracefully</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Authentication errors show proper messages</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Loading states work correctly</Text>
          </View>
        </View>

        {/* Performance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Performance</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• App loads quickly</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Smooth scrolling in lists</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• No memory leaks</Text>
          </View>
        </View>

        {/* Platform Specific Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Platform Specific</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• iOS: Safe area handling works</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Android: Back button handling works</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Web: Responsive design works</Text>
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Test on both iOS and Android devices</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Test with different screen sizes</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• Test with slow network conditions</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    ...shadows.sm,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    textTransform: 'capitalize',
  },
  checklistItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemText: {
    flex: 1,
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  itemStatus: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  notesCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    ...shadows.sm,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  hostCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 20,
    ...shadows.sm,
  },
  hostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  hostText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  checklistText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
