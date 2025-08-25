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
import { shadows } from '@/utils/shadows';
import { useToast } from '@/contexts/ToastContext';

type HostRequest = {
  id: string;
  email: string;
  role: string;
  host_approved: boolean;
  created_at: string;
};

export default function HostRequestsScreen() {
  const { showToast } = useToast();
  const [hostRequests, setHostRequests] = useState<HostRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<HostRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const loadHostRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, host_approved, created_at')
        .eq('role', 'host')
        .eq('host_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHostRequests(data || []);
      applyFilters(data || [], searchEmail, dateFilter);
    } catch (error) {
      showToast('Failed to load host requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHostRequests();
    setRefreshing(false);
  };

  const approveHost = async (userId: string) => {
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (!confirm('Are you sure you want to approve this host? They will be able to create chargers.')) {
        return;
      }
    } else {
      Alert.alert(
        'Approve Host',
        'Are you sure you want to approve this host? They will be able to create chargers.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: () => performApprove(userId) }
        ]
      );
      return;
    }
    
    await performApprove(userId);
  };

  const performApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ host_approved: true })
        .eq('id', userId);

      if (error) throw error;
      
      showToast('Host approved successfully', 'success');
      loadHostRequests();
    } catch (error) {
      showToast('Failed to approve host', 'error');
    }
  };

  const rejectHost = async (userId: string) => {
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (!confirm('Are you sure you want to reject this host? They will remain as a customer.')) {
        return;
      }
    } else {
      Alert.alert(
        'Reject Host',
        'Are you sure you want to reject this host? They will remain as a customer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reject', style: 'destructive', onPress: () => performReject(userId) }
        ]
      );
      return;
    }
    
    await performReject(userId);
  };

  const performReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'customer',
          host_approved: false 
        })
        .eq('id', userId);

      if (error) throw error;
      
      showToast('Host rejected and converted to customer', 'success');
      loadHostRequests();
    } catch (error) {
      showToast('Failed to reject host', 'error');
    }
  };

  const renderHostRequest = ({ item }: { item: HostRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#6B7280" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.requestDate}>
              Requested: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusBadge}>
          <Text style={[
            styles.statusText,
            { color: item.host_approved ? '#059669' : '#F59E0B' }
          ]}>
            {item.host_approved ? 'Approved' : 'Pending'}
          </Text>
        </View>
      </View>

      {!item.host_approved && (
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => approveHost(item.id)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </Pressable>
          
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => rejectHost(item.id)}
          >
            <Ionicons name="close" size={16} color="white" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  useEffect(() => {
    loadHostRequests();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading host requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const applyFilters = (requests: HostRequest[], email: string, date: string) => {
    let filtered = requests;

    // Email search
    if (email) {
      filtered = filtered.filter(req => 
        req.email.toLowerCase().includes(email.toLowerCase())
      );
    }

    // Date filter
    if (date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(req => {
        const requestDate = new Date(req.created_at);
        switch (date) {
          case 'today':
            return requestDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return requestDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return requestDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredRequests(filtered);
  };

  useEffect(() => {
    applyFilters(hostRequests, searchEmail, dateFilter);
  }, [searchEmail, dateFilter, hostRequests]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email..."
            value={searchEmail}
            onChangeText={setSearchEmail}
          />
        </View>
        
        <View style={styles.dateFilterContainer}>
          <Text style={styles.filterLabel}>Date:</Text>
          <Picker
            selectedValue={dateFilter}
            onValueChange={setDateFilter}
            style={styles.datePicker}
          >
            <Picker.Item label="All Time" value="all" />
            <Picker.Item label="Today" value="today" />
            <Picker.Item label="This Week" value="week" />
            <Picker.Item label="This Month" value="month" />
          </Picker>
        </View>
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderHostRequest}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Host Requests</Text>
            <Text style={styles.emptyStateText}>
              {searchEmail || dateFilter !== 'all' 
                ? 'No requests match your filters.' 
                : 'All host applications have been processed.'}
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
  listContainer: {
    padding: 20,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
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
  approveButton: {
    backgroundColor: '#059669',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  rejectButtonText: {
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
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  datePicker: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
