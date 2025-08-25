import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import type { ChargerType } from '@/types/db';
import { router } from 'expo-router';
import { showSuccess, showError } from '@/utils/alerts';
import { Ionicons } from '@expo/vector-icons';

export default function AddChargerScreen() {
  const { profile } = useAuth();
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<ChargerType>('ac');
  const [powerKw, setPowerKw] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'host') {
      showError('Only hosts can add chargers');
      router.back();
    }
  }, [profile]);

  const validateForm = () => {
    if (!title.trim()) {
      showError('Please enter a charger title');
      return false;
    }
    if (!address.trim()) {
      showError('Please enter an address');
      return false;
    }
    if (!markerPosition) {
      showError('Please set the charger location');
      return false;
    }
    if (powerKw && isNaN(Number(powerKw))) {
      showError('Power must be a valid number');
      return false;
    }
    if (price && isNaN(Number(price))) {
      showError('Price must be a valid number');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('chargers').insert({
        title: title.trim(),
        address: address.trim(),
        type,
        power_kw: powerKw ? Number(powerKw) : null,
        price_per_kwh: price ? Number(price) : null,
        description: description.trim() || null,
        lat: markerPosition!.lat,
        lng: markerPosition!.lng,
        location: `SRID=4326;POINT(${markerPosition!.lng} ${markerPosition!.lat})`,
      });

      if (error) throw error;
      
      showSuccess('Charger added successfully!');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      showError(error.message || 'Failed to add charger');
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webContent}>
          <Ionicons name="phone-portrait" size={64} color="#D1D5DB" />
          <Text style={styles.webTitle}>Mobile Only Feature</Text>
          <Text style={styles.webDescription}>
            Adding chargers with a map is only available on iOS and Android devices.
            Please open this app on your mobile device to add new chargers.
          </Text>
          <Button 
            title="Go Back" 
            onPress={() => router.back()} 
            color="#2563EB"
          />
        </View>
      </View>
    );
  }

  // For native platforms, show a simple form for now
  return (
    <View style={styles.container}>
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.formTitle}>Charger Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Downtown Fast Charger"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Full address of the charger"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Charger Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={type}
              onValueChange={(value) => setType(value)}
              style={styles.picker}
            >
              <Picker.Item label="AC (Slow)" value="ac" />
              <Picker.Item label="DC (Fast)" value="dc" />
              <Picker.Item label="Tesla Supercharger" value="tesla" />
              <Picker.Item label="CHAdeMO" value="chademo" />
              <Picker.Item label="CCS" value="ccs" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Power (kW)</Text>
          <TextInput
            style={styles.input}
            value={powerKw}
            onChangeText={setPowerKw}
            placeholder="e.g., 50"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price per kWh ($)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g., 0.25"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details about the charger..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Latitude *</Text>
          <TextInput
            style={styles.input}
            value={markerPosition?.lat?.toString() || ''}
            onChangeText={(text) => {
              const lat = parseFloat(text);
              if (!isNaN(lat)) {
                setMarkerPosition(prev => ({ 
                  lat, 
                  lng: prev?.lng || 0 
                }));
              }
            }}
            placeholder="e.g., 37.7749"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Longitude *</Text>
          <TextInput
            style={styles.input}
            value={markerPosition?.lng?.toString() || ''}
            onChangeText={(text) => {
              const lng = parseFloat(text);
              if (!isNaN(lng)) {
                setMarkerPosition(prev => ({ 
                  lat: prev?.lat || 0, 
                  lng 
                }));
              }
            }}
            placeholder="e.g., -122.4194"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? 'Adding Charger...' : 'Add Charger'}
            onPress={onSubmit}
            disabled={loading}
            color="white"
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    color: '#111827',
    backgroundColor: 'white',
    fontSize: 16,
  },
  textArea: {
    height: 80,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  webContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  webDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
});


