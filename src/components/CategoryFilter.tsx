import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Category } from '../types';

interface CategoryFilterProps {
  selectedCategory: Category | 'all';
  onSelect: (category: Category | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.button,
          selectedCategory === 'all' && styles.selectedButton
        ]}
        onPress={() => onSelect('all')}
      >
        <Text style={[
          styles.buttonText,
          selectedCategory === 'all' && styles.selectedButtonText
        ]}>
          All
        </Text>
      </TouchableOpacity>
      {Object.values(Category).map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.button,
            selectedCategory === category && styles.selectedButton
          ]}
          onPress={() => onSelect(category)}
        >
          <Text style={[
            styles.buttonText,
            selectedCategory === category && styles.selectedButtonText
          ]}>
            {category.replace('_', ' ').toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  selectedButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  selectedButtonText: {
    color: 'white',
  },
});
