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

type ChargerWithHost = {
  id: string;
  title: string;
  type: string;
  power_kw: number | null;
  price_per_kwh: number | null;
  active: boolean;
  created_at: string;
  host: {
    email: string;
  };
};

export default function ChargersScreen() {
  const { showToast } = useToast();
  const [chargers, setChargers] = useState<ChargerWithHost[]>([]);
  const [filteredChargers, setFilteredChargers] = useState<ChargerWithHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [searchTitle, setSearchTitle] = useState('');

  const loadChargers = async () => {
    try {
      const { data, error } = await supabase
        .from('chargers')
        .select(`
          id,
          title,
          type,
          power_kw,
          price_per_kwh,
          active,
          created_at,
          host:profiles!host_id(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChargers(data || []);
      applyFilters(data || [], statusFilter, typeFilter, priceRange, searchTitle);
    } catch (error) {
      showToast('Failed to load chargers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChargers();
    setRefreshing(false);
  };

  const applyFilters = (
    chargers: ChargerWithHost[],
    status: string,
    type: string,
    price: string,
    search: string
  ) => {
    let filtered = chargers;

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(charger => 
        status === 'active' ? charger.active : !charger.active
      );
    }

    // Type filter
    if (type !== 'all') {
      filtered = filtered.filter(charger => charger.type === type);
    }

    // Price range filter
    if (price !== 'all') {
      filtered = filtered.filter(charger => {
        if (!charger.price_per_kwh) return false;
        switch (price) {
          case 'low':
            return charger.price_per_kwh < 0.20;
          case 'medium':
            return charger.price_per_kwh >= 0.20 && charger.price_per_kwh < 0.40;
          case 'high':
            return charger.price_per_kwh >= 0.40;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (search) {
      filtered = filtered.filter(charger =>
        charger.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredChargers(filtered);
  };

  useEffect(() => {
    applyFilters(chargers, statusFilter, typeFilter, priceRange, searchTitle);
  }, [statusFilter, typeFilter, priceRange, searchTitle, chargers]);

  const toggleActive = async (chargerId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('chargers')
        .update({ active: !currentActive })
        .eq('id', chargerId);

      if (error) throw error;
      
      showToast(`Charger ${!currentActive ? 'activated' : 'deactivated'} successfully`, 'success');
      loadChargers();
    } catch (error) {
      showToast('Failed to update charger status', 'error');
    }
  };

  const deleteCharger = async (chargerId: string, chargerTitle: string) => {
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to delete "${chargerTitle}"? This action cannot be undone.`)) {
        return;
      }
    } else {
      Alert.alert(
        'Delete Charger',
        `Are you sure you want to delete "${chargerTitle}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDelete(chargerId) }
        ]
      );
      return;
    }
    
    await performDelete(chargerId);
  };

  const performDelete = async (chargerId: string) => {
    try {
      const { error } = await supabase
        .from('chargers')
        .delete()
        .eq('id', chargerId);

      if (error) throw error;
      
      showToast('Charger deleted successfully', 'success');
      loadChargers();
    } catch (error) {
      showToast('Failed to delete charger', 'error');
    }
  };

  const renderCharger = ({ item }: { item: ChargerWithHost }) => (
    <View style={styles.chargerCard}>
      <View style={styles.chargerHeader}>
        <View style={styles.chargerInfo}>
          <Text style={styles.chargerTitle}>{item.title}</Text>
          <Text style={styles.chargerHost}>Host: {item.host?.email || 'Unknown'}</Text>
        </View>
        
        <View style={styles.statusBadge}>
          <Text style={[
            styles.statusText,
            { color: item.active ? '#059669' : '#DC2626' }
          ]}>
            {item.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.chargerDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{item.type.toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Power:</Text>
          <Text style={styles.detailValue}>{item.power_kw || 'N/A'} kW</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>
            {item.price_per_kwh ? `$${item.price_per_kwh}/kWh` : 'N/A'}
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
          style={[styles.actionButton, item.active ? styles.deactivateButton : styles.activateButton]}
          onPress={() => toggleActive(item.id, item.active)}
        >
          <Ionicons 
            name={item.active ? "pause" : "play"} 
            size={16} 
            color="white" 
          />
          <Text style={styles.actionButtonText}>
            {item.active ? 'Deactivate' : 'Activate'}
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.actionButton, styles.editButton]}
          onPress={() => showToast('Edit functionality coming soon', 'info')}
        >
          <Ionicons name="create" size={16} color="white" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </Pressable>
        
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteCharger(item.id, item.title)}
        >
          <Ionicons name="trash" size={16} color="white" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  useEffect(() => {
    loadChargers();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading chargers...</Text>
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
            placeholder="Search by title..."
            value={searchTitle}
            onChangeText={setSearchTitle}
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
              <Picker.Item label="Active" value="active" />
              <Picker.Item label="Inactive" value="inactive" />
            </Picker>
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type:</Text>
            <Picker
              selectedValue={typeFilter}
              onValueChange={setTypeFilter}
              style={styles.filterPicker}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="AC" value="ac" />
              <Picker.Item label="DC" value="dc" />
              <Picker.Item label="Tesla" value="tesla" />
            </Picker>
          </View>
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Price:</Text>
            <Picker
              selectedValue={priceRange}
              onValueChange={setPriceRange}
              style={styles.filterPicker}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Low (<$0.20)" value="low" />
              <Picker.Item label="Medium ($0.20-$0.40)" value="medium" />
              <Picker.Item label="High (>$0.40)" value="high" />
            </Picker>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredChargers}
        keyExtractor={(item) => item.id}
        renderItem={renderCharger}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flash-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Chargers Found</Text>
            <Text style={styles.emptyStateText}>
              {searchTitle || statusFilter !== 'all' || typeFilter !== 'all' || priceRange !== 'all'
                ? 'No chargers match your filters.' 
                : 'No chargers have been added yet.'}
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
  chargerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.md,
  },
  chargerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chargerInfo: {
    flex: 1,
  },
  chargerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  chargerHost: {
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
  chargerDetails: {
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
  activateButton: {
    backgroundColor: '#059669',
  },
  deactivateButton: {
    backgroundColor: '#DC2626',
  },
  editButton: {
    backgroundColor: '#2563EB',
  },
  deleteButton: {
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
