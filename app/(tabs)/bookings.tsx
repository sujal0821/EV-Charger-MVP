import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { Booking, Charger } from '@/types/db';
import { useAuth } from '@/store/useAuth';
import { showSuccess, showError, showConfirm } from '@/utils/alerts';

type BookingWithCharger = Booking & {
  chargers: Charger;
};

export default function BookingsScreen() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<BookingWithCharger[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          charger:chargers(title, address, price_per_kwh)
        `)
        .eq('user_id', session.user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setBookings((data as BookingWithCharger[]) ?? []);
    } catch (error) {
      showError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      
      showSuccess('Booking cancelled');
      loadBookings(); // Refresh the list
    } catch (error) {
      showError('Failed to cancel booking');
    }
  };

  const deleteBooking = async (bookingId: string) => {
    showConfirm(
      'Delete Booking',
      'Are you sure you want to delete this booking? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);

          if (error) throw error;
          
          showSuccess('Booking deleted');
          loadBookings(); // Refresh the list
        } catch (error) {
          showError('Failed to delete booking');
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#2563EB';
      case 'completed': return '#059669';
      case 'cancelled': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'completed': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  };

  const calculatePrice = (pricePerKwh: number | null, start: string, end: string) => {
    if (!pricePerKwh) return 'Price not set';
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Assuming average 50kW charging rate
    const estimatedKwh = diffHours * 50;
    const estimatedCost = estimatedKwh * pricePerKwh;
    
    return `~$${estimatedCost.toFixed(2)}`;
  };

  const renderBookingItem = ({ item }: { item: BookingWithCharger }) => (
    <View style={styles.bookingItem}>
      <View style={styles.bookingHeader}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={20} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          {item.status === 'pending' && (
            <Pressable 
              style={[styles.actionButton, styles.cancelButton]} 
              onPress={() => cancelBooking(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
          
          {['pending', 'confirmed', 'cancelled'].includes(item.status) && (
            <Pressable 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={() => deleteBooking(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </Pressable>
          )}
        </View>
      </View>
      
      <View style={styles.bookingInfo}>
        <Text style={styles.chargerTitle}>{item.chargers.title}</Text>
        <Text style={styles.chargerAddress}>{item.chargers.address}</Text>
        <Text style={styles.bookingTime}>
          {new Date(item.start_time).toLocaleDateString()} • {new Date(item.start_time).toLocaleTimeString()} - {new Date(item.end_time).toLocaleTimeString()}
        </Text>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {formatDateTime(item.start_time)} - {formatDateTime(item.end_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Duration: {calculateDuration(item.start_time, item.end_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Estimated cost: {calculatePrice(item.chargers.price_per_kwh, item.start_time, item.end_time)}
          </Text>
        </View>
      </View>
    </View>
  );

  useEffect(() => {
    loadBookings();
  }, [session?.user]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <View style={styles.bookingActions}>
                {item.status === 'pending' && (
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => cancelBooking(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.actionButton}
                  onPress={() => deleteBooking(item.id)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
            
            <View style={styles.bookingInfo}>
              <Text style={styles.chargerTitle}>{item.chargers.title}</Text>
              <Text style={styles.chargerAddress}>{item.chargers.address}</Text>
              <Text style={styles.bookingTime}>
                {new Date(item.start_time).toLocaleDateString()} • {new Date(item.start_time).toLocaleTimeString()} - {new Date(item.end_time).toLocaleTimeString()}
              </Text>
            </View>
            
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  Duration: {Math.round((new Date(item.end_time).getTime() - new Date(item.start_time).getTime()) / (1000 * 60 * 60))} hours
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  Estimated cost: {calculatePrice(item.chargers.price_per_kwh, item.start_time, item.end_time)}
                </Text>
              </View>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBookings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Bookings Yet</Text>
            <Text style={styles.emptyStateText}>
              {loading ? 'Loading bookings...' : 'You haven\'t made any bookings yet.'}
            </Text>
            {!loading && (
              <Text style={styles.emptyStateSubtext}>
                Book a charger from the Home tab to get started!
              </Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  bookingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  cancelButtonText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  chargerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  chargerAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  bookingInfo: {
    marginBottom: 12,
  },
  bookingTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
});


