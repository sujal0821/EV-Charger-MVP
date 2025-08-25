import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { shadows } from '@/utils/shadows';

type AnalyticsData = {
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  platformCommission: number;
  activeChargers: number;
  pendingHosts: number;
  commissionRate: number;
};

export default function AnalyticsScreen() {
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    platformCommission: 0,
    activeChargers: 0,
    pendingHosts: 0,
    commissionRate: 15, // Default 15%
  });
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState('15');

  const loadAnalytics = async () => {
    try {
      // Load all data in parallel
      const [
        bookingsResult,
        chargersResult,
        hostsResult,
        commissionResult
      ] = await Promise.all([
        supabase.from('bookings').select('*'),
        supabase.from('chargers').select('*'),
        supabase.from('profiles').select('*').eq('role', 'host').eq('host_approved', false),
        supabase.from('settings').select('commission_rate').eq('key', 'platform_commission').single()
      ]);

      // Process bookings data
      const bookings = bookingsResult.data || [];
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      
      // Calculate revenue (simplified - in real app, this would be more complex)
      const totalRevenue = bookings
        .filter(b => b.status === 'completed' && b.payment_status === 'paid')
        .reduce((sum, booking) => {
          // This is a simplified calculation - in reality, you'd have actual payment amounts
          return sum + 10; // Assume $10 per completed booking for demo
        }, 0);

      // Process chargers data
      const chargers = chargersResult.data || [];
      const activeChargers = chargers.filter(c => c.active).length;

      // Process hosts data
      const pendingHosts = hostsResult.data?.length || 0;

      // Get commission rate
      const commissionRate = commissionResult.data?.commission_rate || 15;

      // Calculate platform commission
      const platformCommission = (totalRevenue * commissionRate) / 100;

      setAnalytics({
        totalBookings,
        completedBookings,
        totalRevenue,
        platformCommission,
        activeChargers,
        pendingHosts,
        commissionRate,
      });

      setCommissionRate(commissionRate.toString());
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionRate = async () => {
    const newRate = parseFloat(commissionRate);
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      showToast('Please enter a valid commission rate (0-100%)', 'error');
      return;
    }

    try {
      // Try to update existing setting
      let { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'platform_commission', 
          commission_rate: newRate,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      showToast(`Commission rate updated to ${newRate}%`, 'success');
      setAnalytics(prev => ({
        ...prev,
        commissionRate: newRate,
        platformCommission: (prev.totalRevenue * newRate) / 100
      }));
    } catch (error) {
      showToast('Failed to update commission rate', 'error');
    }
  };

  const getRevenueTrend = () => {
    // Simplified trend calculation - in real app, this would use actual time series data
    const recentBookings = analytics.totalBookings;
    const previousPeriod = Math.max(0, recentBookings - 2);
    const trend = recentBookings > previousPeriod ? 'up' : recentBookings < previousPeriod ? 'down' : 'stable';
    
    return {
      trend,
      percentage: previousPeriod > 0 ? Math.round(((recentBookings - previousPeriod) / previousPeriod) * 100) : 0
    };
  };

  const getTopHosts = () => {
    // Simplified top hosts - in real app, this would query actual earnings data
    return [
      { email: 'host1@example.com', earnings: 150, chargers: 3 },
      { email: 'host2@example.com', earnings: 120, chargers: 2 },
      { email: 'host3@example.com', earnings: 90, chargers: 1 },
    ];
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const revenueTrend = getRevenueTrend();
  const topHosts = getTopHosts();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <Text style={styles.subtitle}>
            Platform performance and insights
          </Text>
        </View>

        {/* KPIs Grid */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="calendar" size={24} color="#2563EB" />
              </View>
              <Text style={styles.kpiNumber}>{analytics.totalBookings}</Text>
              <Text style={styles.kpiLabel}>Total Bookings</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
              </View>
              <Text style={styles.kpiNumber}>{analytics.completedBookings}</Text>
              <Text style={styles.kpiLabel}>Completed</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="cash" size={24} color="#7C3AED" />
              </View>
              <Text style={styles.kpiNumber}>${analytics.totalRevenue}</Text>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="trending-up" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.kpiNumber}>${analytics.platformCommission}</Text>
              <Text style={styles.kpiLabel}>Platform Commission</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="flash" size={24} color="#DC2626" />
              </View>
              <Text style={styles.kpiNumber}>{analytics.activeChargers}</Text>
              <Text style={styles.kpiLabel}>Active Chargers</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="people" size={24} color="#6B7280" />
              </View>
              <Text style={styles.kpiNumber}>{analytics.pendingHosts}</Text>
              <Text style={styles.kpiLabel}>Pending Hosts</Text>
            </View>
          </View>
        </View>

        {/* Revenue Trend */}
        <View style={styles.trendSection}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendLabel}>This Period</Text>
              <View style={[styles.trendIndicator, { backgroundColor: getTrendColor(revenueTrend.trend) }]}>
                <Ionicons 
                  name={getTrendIcon(revenueTrend.trend)} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.trendPercentage}>
                  {revenueTrend.percentage > 0 ? '+' : ''}{revenueTrend.percentage}%
                </Text>
              </View>
            </View>
            <Text style={styles.trendValue}>${analytics.totalRevenue}</Text>
            <Text style={styles.trendDescription}>
              {revenueTrend.trend === 'up' ? 'Revenue increased' : 
               revenueTrend.trend === 'down' ? 'Revenue decreased' : 
               'Revenue remained stable'} compared to previous period
            </Text>
          </View>
        </View>

        {/* Top Hosts */}
        <View style={styles.hostsSection}>
          <Text style={styles.sectionTitle}>Top Hosts by Earnings</Text>
          <View style={styles.hostsList}>
            {topHosts.map((host, index) => (
              <View key={index} style={styles.hostCard}>
                <View style={styles.hostRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.hostInfo}>
                  <Text style={styles.hostEmail}>{host.email}</Text>
                  <Text style={styles.hostStats}>
                    {host.chargers} charger{host.chargers !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.hostEarnings}>
                  <Text style={styles.earningsAmount}>${host.earnings}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Commission Configuration */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>Platform Configuration</Text>
          <View style={styles.configCard}>
            <Text style={styles.configLabel}>Commission Rate</Text>
            <Text style={styles.configDescription}>
              Set the platform commission rate (currently {analytics.commissionRate}%)
            </Text>
            <View style={styles.commissionInput}>
              <TextInput
                style={styles.input}
                value={commissionRate}
                onChangeText={setCommissionRate}
                placeholder="15"
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffix}>%</Text>
              <Pressable style={styles.updateButton} onPress={updateCommissionRate}>
                <Text style={styles.updateButtonText}>Update</Text>
              </Pressable>
            </View>
            <Text style={styles.configNote}>
              Commission rate affects all future transactions. Current rate: {analytics.commissionRate}%
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'up': return '#059669';
    case 'down': return '#DC2626';
    default: return '#6B7280';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return 'trending-up';
    case 'down': return 'trending-down';
    default: return 'remove';
  }
};

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
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  },
  kpiSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    ...shadows.md,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  trendSection: {
    marginBottom: 32,
  },
  trendCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...shadows.md,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trendPercentage: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  trendValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  trendDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  hostsSection: {
    marginBottom: 32,
  },
  hostsList: {
    gap: 12,
  },
  hostCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  hostRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  hostInfo: {
    flex: 1,
  },
  hostEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  hostStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  hostEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
  },
  configSection: {
    marginBottom: 32,
  },
  configCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...shadows.md,
  },
  configLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  configDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  commissionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputSuffix: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  configNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
