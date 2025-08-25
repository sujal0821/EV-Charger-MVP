import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EnvVarCheckerProps {
  onClose?: () => void;
}

export default function EnvVarChecker({ onClose }: EnvVarCheckerProps) {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={24} color="#F59E0B" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Missing Environment Variables</Text>
        <Text style={styles.description}>
          The following environment variables are required but not set:
        </Text>
        <View style={styles.varList}>
          {missingVars.map(varName => (
            <Text key={varName} style={styles.varName}>
              • {varName}
            </Text>
          ))}
        </View>
        <Text style={styles.helpText}>
          Please add these to your .env file and restart the app.
        </Text>
      </View>
      
      {onClose && (
        <Pressable style={styles.closeButton} onPress={onClose} onTouchStart={() => {}} onTouchEnd={() => {}}>
          <Ionicons name="close" size={20} color="#6B7280" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 20,
  },
  varList: {
    marginBottom: 8,
  },
  varName: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  helpText: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
