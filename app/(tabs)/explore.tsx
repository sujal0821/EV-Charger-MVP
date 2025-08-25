import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shadows } from '@/utils/shadows';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showConfirm, showError, showSuccess } from '@/utils/alerts';

export default function ExploreScreen() {
  const { profile, session, signOut } = useAuth();

  const requestHostRole = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'host' })
        .eq('id', profile?.id);

      if (error) throw error;
      
      showSuccess('Your request has been submitted. You can now add chargers to the network.');
    } catch (error) {
      showError('Failed to request host role. Please try again.');
    }
  };

  const showHostRoleInfo = () => {
    Alert.alert(
      'Become a Host',
      'Hosts can add EV chargers to the network and earn money from bookings. You\'ll need to provide charger details and set pricing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Role', onPress: requestHostRole }
      ]
    );
  };

  const handleLogout = async () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        try {
          await signOut();
          router.replace('/(auth)/sign-in');
        } catch (error) {
          console.error('Sign out error:', error);
          showError('Failed to sign out. Please try again.');
        }
      }
    );
  };

  // DEV ONLY: Create mock chargers
  const createMockChargers = async () => {
    if (Platform.OS === 'web') {
      showError('Mock chargers can only be created on mobile devices.');
      return;
    }

    if (!session?.user) {
      showError('You must be logged in to create mock chargers');
      return;
    }

    try {
      const mockChargers = [
        {
          host_id: session.user.id,
          title: 'Downtown Fast Charger',
          address: '123 Main St, Downtown',
          type: 'dc',
          power_kw: 150,
          price_per_kwh: 0.35,
          description: 'High-speed DC charger in downtown area',
          lat: 37.7749,
          lng: -122.4194,
          location: 'SRID=4326;POINT(-122.4194 37.7749)',
        },
        {
          host_id: session.user.id,
          title: 'Mall Parking Charger',
          address: '456 Shopping Ave, Mall District',
          type: 'ac',
          power_kw: 22,
          price_per_kwh: 0.25,
          description: 'Convenient AC charger at shopping mall',
          lat: 37.7849,
          lng: -122.4094,
          location: 'SRID=4326;POINT(-122.4094 37.7849)',
        },
        {
          host_id: session.user.id,
          title: 'Tesla Supercharger',
          address: '789 Tech Blvd, Innovation District',
          type: 'tesla',
          power_kw: 250,
          price_per_kwh: 0.45,
          description: 'Tesla Supercharger for Tesla vehicles',
          lat: 37.7949,
          lng: -122.3994,
          location: 'SRID=4326;POINT(-122.3994 37.7949)',
        },
      ];

      let successCount = 0;
      let errorCount = 0;

      for (const charger of mockChargers) {
        const { error } = await supabase.from('chargers').insert(charger);
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        const message = `Successfully created ${successCount} mock chargers!${errorCount > 0 ? `\n\n${errorCount} failed to create.` : ''}\n\nCheck the home screen to see them on the map.`;
        showSuccess(message);
      } else {
        showError('Failed to create any mock chargers. Check the console for details.');
      }
    } catch (error) {
      showError('Failed to create mock chargers');
    }
  };

  const createSingleTestCharger = async () => {
    if (Platform.OS === 'web') {
      showError('Mock chargers can only be created on mobile devices.');
      return;
    }

    if (!session?.user) {
      showError('You must be logged in to create mock chargers');
      return;
    }

    try {
      const testCharger = {
        host_id: session.user.id,
        title: 'Test Charger',
        address: '123 Test St, Test City',
        type: 'dc',
        power_kw: 50,
        price_per_kwh: 0.20,
        description: 'A test charger for development purposes',
        lat: 37.7749,
        lng: -122.4194,
        location: 'SRID=4326;POINT(-122.4194 37.7749)',
      };
      const { error } = await supabase.from('chargers').insert(testCharger);
      if (error) {
        showError('Failed to create single test charger. Check the console for details.');
      } else {
        const message = `Successfully created single test charger: ${testCharger.title}. Check the home screen to see it on the map.`;
        showSuccess(message);
      }
    } catch (error) {
      showError('Failed to create single test charger');
    }
  };

  const becomeHost = () => {
    showConfirm(
      'Become a Host',
      'Hosts can add EV chargers to the network and earn money from bookings. You\'ll need to provide charger details and set pricing.',
      requestHostRole
    );
  };

  const checkExistingChargers = async () => {
    try {
      const { count, error } = await supabase
        .from('chargers')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        showError('Failed to check existing chargers');
        return;
      }
      
      showSuccess(`There are currently ${count} chargers in the database.`);
    } catch (error) {
      showError('Failed to check existing chargers');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Ionicons name="flash" size={48} color="#2563EB" />
        </View>
        <Text style={styles.heroTitle}>EV Charger Network</Text>
        <Text style={styles.heroSubtitle}>
          Find, book, and review EV charging stations in your area
        </Text>
      </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          
          <View style={styles.accountCard}>
            <View style={styles.accountInfo}>
              <Ionicons name="mail" size={20} color="#6B7280" />
              <Text style={styles.accountEmail}>{session?.user?.email}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Ionicons name="shield" size={20} color="#6B7280" />
              <Text style={styles.accountRole}>Role: {profile?.role || 'User'}</Text>
            </View>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* DEV TOOLS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bug" size={24} color="#DC2626" />
            <Text style={styles.sectionTitle}>🛠️ Dev Tools</Text>
          </View>
          
          <View style={styles.devCard}>
            <Text style={styles.devTitle}>🛠️ Development Tools</Text>
            <Text style={styles.devDescription}>
              These tools are for development and testing only.
            </Text>
            
            <View style={styles.devButtonsContainer}>
              <Pressable style={styles.devButton} onPress={createMockChargers}>
                <Text style={styles.devButtonText}>Create 3 Mock Chargers</Text>
              </Pressable>

              <Pressable style={styles.devButton} onPress={createSingleTestCharger}>
                <Text style={styles.devButtonText}>Create 1 Test Charger</Text>
              </Pressable>
              
              <Pressable style={styles.devButton} onPress={becomeHost}>
                <Text style={styles.devButtonText}>Become Host (DEV)</Text>
              </Pressable>

              <Pressable style={styles.devButton} onPress={checkExistingChargers}>
                <Text style={styles.devButtonText}>Check DB Status</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Host Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>Host a Charger</Text>
          </View>
          
          {profile?.role === 'host' ? (
            <View style={styles.hostCard}>
              <View style={styles.hostInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
                <Text style={styles.hostStatus}>You're a verified host</Text>
              </View>
              <Text style={styles.hostDescription}>
                Add your EV chargers to the network and start earning from bookings.
              </Text>
              <Pressable 
                onPress={() => router.push('/(host)/add-charger')}
                style={styles.hostButton}
              >
                <Text style={styles.hostButtonText}>Add a Charger</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.hostCard}>
              <View style={styles.hostInfo}>
                <Ionicons name="information-circle" size={24} color="#2563EB" />
                <Text style={styles.hostStatus}>Become a host</Text>
              </View>
              <Text style={styles.hostDescription}>
                Hosts can add EV chargers to the network and earn money from bookings.
              </Text>
              <Pressable 
                onPress={showHostRoleInfo}
                style={styles.hostButton}
              >
                <Text style={styles.hostButtonText}>Request Host Role</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>App Features</Text>
          </View>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="map" size={20} color="#2563EB" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Find Chargers</Text>
                <Text style={styles.featureDescription}>
                  Discover nearby EV charging stations with real-time availability
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="calendar" size={20} color="#2563EB" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Easy Booking</Text>
                <Text style={styles.featureDescription}>
                  Book charging sessions with flexible time slots
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="star-half" size={20} color="#2563EB" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Rate & Review</Text>
                <Text style={styles.featureDescription}>
                  Share your experience and help others choose the best chargers
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="business" size={20} color="#2563EB" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Host Network</Text>
                <Text style={styles.featureDescription}>
                  Join our network of hosts and earn from your chargers
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>How It Works</Text>
          </View>
          
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Find a Charger</Text>
                <Text style={styles.stepDescription}>
                  Browse the map or list to find available chargers near you
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Book Your Time</Text>
                <Text style={styles.stepDescription}>
                  Select your preferred start and end time for charging
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Charge & Go</Text>
                <Text style={styles.stepDescription}>
                  Arrive at your scheduled time, charge your vehicle, and leave a review
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <View style={styles.supportCard}>
            <Ionicons name="chatbubble-ellipses" size={32} color="#2563EB" />
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportDescription}>
              Have questions about using the app or becoming a host? We're here to help!
            </Text>
            <Pressable style={styles.supportButton}>
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </Pressable>
          </View>
        </View>

        {/* Admin Section */}
        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Admin Access</Text>
            </View>
            <View style={styles.accountCard}>
              <Text style={styles.sectionText}>
                You have admin privileges. Access admin tools to manage the platform.
              </Text>
              <Pressable 
                style={styles.adminButton}
                onPress={() => router.push('/(admin)/' as any)}
              >
                <Text style={styles.adminButtonText}>Go to Admin Dashboard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  heroSection: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    ...shadows.sm,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  accountEmail: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  accountRole: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  devCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 24,
    ...shadows.md,
    borderWidth: 3,
    borderColor: '#F59E0B',
    borderStyle: 'solid',
  },
  devTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  devDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  devButtonsContainer: {
    gap: 12,
    width: '100%',
  },
  devButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    minHeight: 50,
    borderWidth: 2,
    borderColor: '#B91C1C',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  hostCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    ...shadows.sm,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  hostStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  hostDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  hostButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...shadows.sm,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...shadows.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  supportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    ...shadows.sm,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  supportButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  devButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  adminButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
