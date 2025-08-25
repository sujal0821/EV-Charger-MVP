import { Stack } from 'expo-router';
import { RoleGuard } from '@/components/RoleGuard';

export default function HostLayout() {
  return (
    <RoleGuard requiredRole="host" requireHostApproval={true}>
      <Stack>
        <Stack.Screen 
          name="add-charger" 
          options={{ 
            title: 'Add Charger',
            headerShown: true,
          }} 
        />
      </Stack>
    </RoleGuard>
  );
}
