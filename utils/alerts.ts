import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertOptions = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

/**
 * Web-compatible alert function that works on both web and mobile
 */
export const showAlert = (options: AlertOptions): void => {
  const { title, message, buttons = [] } = options;

  if (Platform.OS === 'web') {
    // On web, use browser confirm/alert
    if (buttons.length === 0) {
      // Simple alert
      alert(message || title);
    } else if (buttons.length === 1) {
      // Single button - just show message
      alert(message || title);
      buttons[0]?.onPress?.();
    } else if (buttons.length === 2) {
      // Two buttons - use confirm dialog
      const isConfirmed = confirm(message || title);
      if (isConfirmed) {
        // Find the non-cancel button and execute it
        const actionButton = buttons.find(btn => btn.style !== 'cancel');
        actionButton?.onPress?.();
      } else {
        // Find the cancel button and execute it
        const cancelButton = buttons.find(btn => btn.style === 'cancel');
        cancelButton?.onPress?.();
      }
    } else {
      // Multiple buttons - use confirm for first action button
      const actionButton = buttons.find(btn => btn.style !== 'cancel');
      const cancelButton = buttons.find(btn => btn.style === 'cancel');
      
      const isConfirmed = confirm(message || title);
      if (isConfirmed) {
        actionButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    }
  } else {
    // On mobile, use React Native Alert
    Alert.alert(title, message, buttons);
  }
};

/**
 * Simple success message
 */
export const showSuccess = (message: string): void => {
  showAlert({ title: 'Success', message });
};

/**
 * Simple error message
 */
export const showError = (message: string): void => {
  showAlert({ title: 'Error', message });
};

/**
 * Confirmation dialog
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  showAlert({
    title,
    message,
    buttons: [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ],
  });
};
