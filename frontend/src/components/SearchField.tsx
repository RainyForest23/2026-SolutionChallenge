import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SearchField({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState('');

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="URL을 입력하세요..."
        placeholderTextColor="rgba(100, 100, 100, 0.7)"
        value={url}
        onChangeText={setUrl}
        onSubmitEditing={() => url.trim() && onSubmit(url)}
        returnKeyType="go"
      />
      <TouchableOpacity onPress={() => url.trim() && onSubmit(url)} style={styles.icon}>
        <Ionicons name="search" size={20} color="rgba(100,100,100,0.7)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.82,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  input: {
    flex: 1,
    color: 'rgba(100,100,100,0.9)',
    fontSize: 15,
  },
  icon: {
    marginLeft: 8,
  },
});
