// frontend/components/AppBackground.tsx
import React from 'react';
import { StyleSheet, ImageBackground, ViewStyle } from 'react-native';

interface AppBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({ children, style }) => {
  return (
    <ImageBackground
      source={require('../assets/images/bg.jpg')}
      style={[styles.backgroundImage, style]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
});