import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { Ionicons } from '@expo/vector-icons';

type BookingWithCharger = {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  charger: {
    id: string;
    title: string;
    address: string;
  };
};

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { session } = useAuth();
  const [booking, setBooking] = useState<BookingWithCharger | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId || !session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          start_time,
          end_time,
          charger:chargers(id, title, address)
        `)
        .eq('id', bookingId)
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setBooking(data as BookingWithCharger);
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
      router.back();
    }
  };

  const submitReview = async () => {
    if (!booking || !session?.user) return;
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Insert the review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          booking_id: booking.id,
          charger_id: booking.charger.id,
          user_id: session.user.id,
          rating,
          comment: comment.trim() || null,
        });

      if (reviewError) throw reviewError;

      // Update the booking status to completed if it was pending
      if (booking.status === 'pending') {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'completed' })
          .eq('id', booking.id);

        if (updateError) throw updateError;
      }

      Alert.alert('Success', 'Review submitted successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const isEligibleForReview = () => {
    if (!booking) return false;
    
    // Check if booking belongs to current user
    if (!session?.user) return false;
    
    // Check if booking is completed or can be marked as completed
    if (!['pending', 'completed'].includes(booking.status)) return false;
    
    return true;
  };

  const getIneligibilityReason = () => {
    if (!booking) return 'Booking not found';
    if (!session?.user) return 'You must be logged in to leave a review';
    if (!['pending', 'completed'].includes(booking.status)) {
      return `Cannot review ${booking.status} bookings`;
    }
    return '';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!isEligibleForReview()) {
    return (
      <View style={styles.container}>
        <View style={styles.disabledContainer}>
          <Ionicons name="alert-circle" size={64} color="#F59E0B" />
          <Text style={styles.disabledTitle}>Cannot Leave Review</Text>
          <Text style={styles.disabledReason}>{getIneligibilityReason()}</Text>
          <Button 
            title="Go Back" 
            onPress={() => router.back()} 
            color="#6B7280"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Info */}
        <View style={styles.bookingCard}>
          <Text style={styles.bookingTitle}>Booking Details</Text>
          <Text style={styles.chargerName}>{booking?.charger.title}</Text>
          <Text style={styles.chargerAddress}>{booking?.charger.address}</Text>
          <View style={styles.bookingTime}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.bookingTimeText}>
              {new Date(booking?.start_time || '').toLocaleDateString()} at{' '}
              {new Date(booking?.start_time || '').toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Rate Your Experience</Text>
          <Text style={styles.sectionSubtitle}>
            How would you rate this charging session?
          </Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                style={styles.starButton}
                onPress={() => setRating(star)}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                />
              </Pressable>
            ))}
          </View>
          
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select a rating'}
          </Text>
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Additional Comments</Text>
          <Text style={styles.sectionSubtitle}>
            Share your experience (optional)
          </Text>
          
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us about your charging experience..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Button
            title={submitting ? 'Submitting...' : 'Submit Review'}
            onPress={submitReview}
            disabled={submitting || rating === 0}
            color="#2563EB"
          />
        </View>
      </ScrollView>
    </View>
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
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  disabledReason: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  chargerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  chargerAddress: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  bookingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingTimeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F59E0B',
  },
  commentSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    color: '#111827',
    backgroundColor: 'white',
    fontSize: 16,
    height: 100,
  },
  submitSection: {
    marginBottom: 20,
  },
});


