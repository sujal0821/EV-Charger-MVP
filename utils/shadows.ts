import { Platform } from 'react-native';

export const createShadow = (
  elevation: number = 2,
  shadowColor: string = '#000',
  shadowOffset: { width: number; height: number } = { width: 0, height: 1 },
  shadowOpacity: number = 0.1,
  shadowRadius: number = 2
) => {
  return Platform.select({
    web: {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px rgba(0, 0, 0, ${shadowOpacity})`,
    },
    default: {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
      elevation,
    },
  });
};

// Predefined shadow styles
export const shadows = {
  sm: createShadow(1, '#000', { width: 0, height: 1 }, 0.05, 2),
  md: createShadow(2, '#000', { width: 0, height: 2 }, 0.1, 4),
  lg: createShadow(4, '#000', { width: 0, height: 4 }, 0.15, 8),
  xl: createShadow(8, '#000', { width: 0, height: 8 }, 0.2, 16),
};
