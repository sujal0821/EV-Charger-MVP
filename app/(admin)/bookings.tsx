import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { shadows } from '@/utils/shadows';

type BookingWithDetails = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  created_at: string;
  charger: {
    title: string;
    price_per_kwh: number | null;
  };
  user: {
    email: string;
  };
};

export default function BookingsScreen() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchEmail, setSearchEmail] = useState('');

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          status,
          payment_status,
          created_at,
          charger:chargers(title, price_per_kwh),
          user:profiles!user_id(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      applyFilters(data || [], statusFilter, dateFilter, searchEmail);
    } catch (error) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const applyFilters = (
    bookings: BookingWithDetails[],
    status: string,
    date: string,
    search: string
  ) => {
    let filtered = bookings;

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(booking => booking.status === status);
    }

    // Date filter
    if (date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        switch (date) {
          case 'today':
            return bookingDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return bookingDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return bookingDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (search) {
      filtered = filtered.filter(booking =>
        booking.user.email.toLowerCase().includes(search.toLowerCase()) ||
        booking.charger.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  useEffect(() => {
    applyFilters(bookings, statusFilter, dateFilter, searchEmail);
  }, [statusFilter, dateFilter, searchEmail, bookings]);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      showToast(`Booking status updated to ${newStatus}`, 'success');
      loadBookings();
    } catch (error) {
      showToast('Failed to update booking status', 'error');
    }
  };

  const togglePaymentStatus = async (bookingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      showToast(`Payment status updated to ${newStatus}`, 'success');
      loadBookings();
    } catch (error) {
      showToast('Failed to update payment status', 'error');
    }
  };

  const cancelBooking = async (bookingId: string, chargerTitle: string) => {
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to cancel the booking for "${chargerTitle}"?`)) {
        return;
      }
    } else {
      Alert.alert(
        'Cancel Booking',
        `Are you sure you want to cancel the booking for "${chargerTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', style: 'destructive', onPress: () => updateBookingStatus(bookingId, 'cancelled') }
        ]
      );
      return;
    }
    
    await updateBookingStatus(bookingId, 'cancelled');
  };

  const checkOverlap = (bookings: BookingWithDetails[], currentBooking: BookingWithDetails) => {
    const currentStart = new Date(currentBooking.start_time);
    const currentEnd = new Date(currentBooking.end_time);
    
    return bookings.some(booking => {
      if (booking.id === currentBooking.id) return false;
      if (booking.status === 'cancelled' || booking.status === 'completed') return false;
      
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      
      return (currentStart < end && currentEnd > start);
    });
  };

  const renderBooking = ({ item }: { item: BookingWithDetails }) => {
    const hasOverlap = checkOverlap(bookings, item);
    
    return (
      <View style={styles.bookingCard}>
        {hasOverlap && (
          <View style={styles.overlapWarning}>
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text style={styles.overlapText}>Time overlap detected</Text>
          </View>
        )}
        
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.chargerTitle}>{item.charger.title}</Text>
            <Text style={styles.customerEmail}>Customer: {item.user.email}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(item.payment_status) }]}>
              <Text style={styles.paymentText}>{item.payment_status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.start_time).toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.end_time).toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {calculateDuration(item.start_time, item.end_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>
              {item.charger.price_per_kwh ? `$${item.charger.price_per_kwh}/kWh` : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.statusButton]}
            onPress={() => showStatusOptions(item.id, item.charger.title)}
          >
            <Ionicons name="settings" size={16} color="white" />
            <Text style={styles.actionButtonText}>Update Status</Text>
          </Pressable>
          
          <Pressable
            style={[styles.actionButton, styles.paymentButton]}
            onPress={() => togglePaymentStatus(item.id, item.payment_status)}
          >
            <Ionicons name="card" size={16} color="white" />
            <Text style={styles.actionButtonText}>
              {item.payment_status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
            </Text>
          </Pressable>
          
          {item.status !== 'cancelled' && (
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => cancelBooking(item.id, item.charger.title)}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const showStatusOptions = (bookingId: string, chargerTitle: string) => {
    const statusOptions = ['pending', 'confirmed', 'completed', 'cancelled'];
    
    if (Platform.OS === 'web') {
      const status = prompt(
        `Update status for "${chargerTitle}"\n\nOptions: ${statusOptions.join(', ')}`
      );
      if (status && statusOptions.includes(status)) {
        updateBookingStatus(bookingId, status);
      }
    } else {
      Alert.alert(
        'Update Status',
        `Select new status for "${chargerTitle}"`,
        statusOptions.map(status => ({
          text: status.charAt(0).toUpperCase() + status.slice(1),
          onPress: () => updateBookingStatus(bookingId, status)
        }))
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FEF3C7';
      case 'confirmed': return '#DBEAFE';
      case 'completed': return '#D1FAE5';
      case 'cancelled': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#D1FAE5';
      case 'pending': return '#FEF3C7';
      case 'refunded': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  };

  useEffect(() => {
    loadBookings();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email or charger..."
            value={searchEmail}
            onChangeText={setSearchEmail}
          />
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <Picker
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              style={styles.filterPicker}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Confirmed" value="confirmed" />
              <Picker.Item label="Completed" value="completed" />
              <Picker.Item label="Cancelled" value="cancelled" />
            </Picker>
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Date:</Text>
            <Picker
              selectedValue={dateFilter}
              onValueChange={setDateFilter}
              style={styles.filterPicker}
            >
              <Picker.Item label="All Time" value="all" />
              <Picker.Item label="Today" value="today" />
              <Picker.Item label="This Week" value="week" />
              <Picker.Item label="This Month" value="month" />
            </Picker>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Bookings Found</Text>
            <Text style={styles.emptyStateText}>
              {searchEmail || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No bookings match your filters.' 
                : 'No bookings have been made yet.'}
            </Text>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  filtersContainer: {
    padding: 20,
    paddingBottom: 0,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
  },
  filterGroup: {
    flex: 1,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterPicker: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listContainer: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.md,
  },
  overlapWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  overlapText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  chargerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  statusButton: {
    backgroundColor: '#2563EB',
  },
  paymentButton: {
    backgroundColor: '#059669',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  },
});
