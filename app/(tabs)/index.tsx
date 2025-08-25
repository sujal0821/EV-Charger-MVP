import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shadows } from '@/utils/shadows';
import { supabase } from '@/lib/supabase';
import type { Charger } from '@/types/db';
import { useAuth } from '@/store/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const { session } = useAuth();
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'web') {
      // On web, we'll use a default location
      setLocationPermission(true);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to find nearby chargers.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
      }
    } catch (error) {
      // Location permission error handled silently
    }
  };

  const getCurrentLocation = async () => {
    if (Platform.OS === 'web') {
      // On web, use default location
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setUserLocation(location.coords);
      setRegion(newRegion);
    } catch (error) {
      // Location error handled silently
    }
  };

  useEffect(() => {
    loadChargers();
  }, [region]);

  const loadChargers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, let's fetch all chargers instead of using the RPC function
      const { data, error } = await supabase
        .from('chargers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      setChargers((data as Charger[]) ?? []);
    } catch (error) {
      setError('Failed to load chargers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadRating = async () => {
      if (!selectedCharger) return;
      const { data } = await supabase
        .from('reviews_with_charger')
        .select('avg_rating')
        .eq('charger_id', selectedCharger.id)
        .single();
      // setAvgRating((data as any)?.avg_rating ?? null); // This state was removed
    };
    loadRating();
  }, [selectedCharger]);

  const onCreateBooking = async () => {
    if (!session?.user || !selectedCharger) return;
    // setCreating(true); // This state was removed
    const { error } = await supabase.from('bookings').insert({
      charger_id: selectedCharger.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'pending',
    });
    // setCreating(false); // This state was removed
    if (!error) {
      setSelectedCharger(null);
      // Refresh chargers to show updated availability
      loadChargers();
    } else {
      Alert.alert('Booking Error', error.message);
    }
  };

  const renderChargerItem = ({ item }: { item: Charger }) => (
    <Pressable 
      style={styles.chargerItem} 
      onPress={() => setSelectedCharger(item)}
    >
      <View style={styles.chargerHeader}>
        <Text style={styles.chargerTitle}>{item.title}</Text>
        <Text style={styles.chargerType}>{item.type.toUpperCase()}</Text>
      </View>
      <Text style={styles.chargerAddress}>{item.address}</Text>
      <View style={styles.chargerDetails}>
        <Text style={styles.chargerPrice}>
          {item.price_per_kwh ? `$${item.price_per_kwh}/kWh` : 'Price not set'}
        </Text>
        {item.power_kw && (
          <Text style={styles.chargerPower}>{item.power_kw} kW</Text>
        )}
      </View>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Find EV Chargers</Text>
          <Text style={styles.webSubtitle}>
            Map view is not available on web. Open the project on iOS or Android to browse
            chargers on a map and make bookings.
          </Text>
        </View>
        
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Nearby Chargers</Text>
          <FlatList
            data={chargers}
            renderItem={renderChargerItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No chargers found nearby</Text>
                <Text style={styles.emptySubtext}>Try adjusting your location or check back later</Text>
              </View>
            }
          />
        </View>
      </View>
    );
  }

  // Native platform map view
  const isWeb = Platform.OS !== 'ios' && Platform.OS !== 'android';
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Permission Banner */}
      {!locationPermission && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Location access is needed to find nearby chargers
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestLocationPermission}>
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </Pressable>
        </View>
      )}

      {/* Refresh Button */}
      <Pressable style={styles.refreshButton} onPress={loadChargers}>
        <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
      </Pressable>

      {/* Charger Count Badge */}
      <View style={styles.chargerCountBadge}>
        <Text style={styles.chargerCountText}>{chargers.length} chargers</Text>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadChargers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapTitle}>🗺️ Map View</Text>
        <Text style={styles.mapSubtitle}>
          Map view coming soon! For now, browse chargers in the list below.
        </Text>
      </View>

      {/* Chargers List */}
      <View style={styles.chargersListContainer}>
        <Text style={styles.chargersListTitle}>Available Chargers</Text>
        <FlatList
          data={chargers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable 
              style={styles.chargerItem} 
              onPress={() => setSelectedCharger(item)}
            >
              <View style={styles.chargerHeader}>
                <Text style={styles.chargerTitle}>{item.title}</Text>
                <View style={styles.chargerBadge}>
                  <Text style={styles.chargerBadgeText}>
                    {item.type?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.chargerAddress}>{item.address}</Text>
              <View style={styles.chargerDetails}>
                <Text style={styles.chargerPrice}>${item.price_per_kwh}/kWh</Text>
                <Text style={styles.chargerPower}>{item.power_kw} kW</Text>
              </View>
            </Pressable>
          )}
          style={styles.chargersList}
        />
      </View>

      {/* Charger Detail Modal */}
      <Modal
        visible={!!selectedCharger}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCharger(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedCharger?.title}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setSelectedCharger(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalAddress}>{selectedCharger?.address}</Text>
            <Text style={styles.modalType}>Type: {selectedCharger?.type?.toUpperCase()}</Text>
            <Text style={styles.modalPower}>Power: {selectedCharger?.power_kw} kW</Text>
            <Text style={styles.modalPrice}>Price: ${selectedCharger?.price_per_kwh}/kWh</Text>
            
            <View style={styles.bookingSection}>
              <Text style={styles.bookingTitle}>Book This Charger</Text>
              
              <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Start Time:</Text>
                  <DateTimePicker
                    value={startTime}
                    mode="datetime"
                    onChange={(event, date) => date && setStartTime(date)}
                  />
                </View>
                
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>End Time:</Text>
                  <DateTimePicker
                    value={endTime}
                    mode="datetime"
                    onChange={(event, date) => date && setEndTime(date)}
                  />
                </View>
              </View>

              <Pressable
                style={styles.bookButton}
                onPress={onCreateBooking}
              >
                <Text style={styles.bookButtonText}>
                  Book Now
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: 20,
    minHeight: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  webHeader: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  webSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chargerItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadows.sm,
  },
  chargerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chargerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chargerType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chargerAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  chargerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chargerPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  chargerPower: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalContent: {
    marginBottom: 20,
  },
  modalAddress: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalType: {
    fontSize: 14,
    color: '#2563EB',
    marginBottom: 4,
  },
  modalPower: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 8,
  },
  modalRating: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 15,
  },
  bookingSection: {
    marginTop: 15,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  timeSection: {
    marginBottom: 10,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  bookButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bookButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.7,
  },
  permissionBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  permissionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  refreshButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
  chargerCountBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#2563EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    zIndex: 10,
  },
  chargerCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444', // Red for error
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  chargersListContainer: {
    flex: 1,
    padding: 20,
  },
  chargersListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chargersList: {
    // No specific styles for FlatList, it handles its own content
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  mapSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chargerBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chargerBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
});
