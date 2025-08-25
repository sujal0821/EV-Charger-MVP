import { Stack } from 'expo-router';
import { RoleGuard } from '@/components/RoleGuard';

export default function AdminLayout() {
  return (
    <RoleGuard requiredRole="admin">
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Admin Dashboard',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="host-requests" 
          options={{ 
            title: 'Host Requests',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="chargers" 
          options={{ 
            title: 'Manage Chargers',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="bookings" 
          options={{ 
            title: 'Manage Bookings',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="analytics" 
          options={{ 
            title: 'Analytics',
            headerShown: true,
          }} 
        />
      </Stack>
    </RoleGuard>
  );
}
