import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import { LanguageProvider } from '../contexts/LanguageContext';

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  it('handles text search', () => {
    render(
      <LanguageProvider>
        <SearchBar onSearch={mockOnSearch} />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('search.chats');
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: 'test query',
      mediaTypes: [],
      dateRange: {}
    });
  });

  it('handles date range selection', () => {
    render(
      <LanguageProvider>
        <SearchBar onSearch={mockOnSearch} />
      </LanguageProvider>
    );

    // Open filters
    fireEvent.click(screen.getByRole('button'));

    const [startDate, endDate] = screen.getAllByRole('textbox');
    
    fireEvent.change(startDate, { target: { value: '2023-12-01' } });
    expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
      dateRange: { start: new Date('2023-12-01'), end: undefined }
    }));

    fireEvent.change(endDate, { target: { value: '2023-12-31' } });
    expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
      dateRange: { start: new Date('2023-12-01'), end: new Date('2023-12-31') }
    }));
  });

  it('handles media type filters', () => {
    render(
      <LanguageProvider>
        <SearchBar onSearch={mockOnSearch} />
      </LanguageProvider>
    );

    // Open filters
    fireEvent.click(screen.getByRole('button'));

    // Toggle image filter
    fireEvent.click(screen.getByText('search.media_type.image'));
    expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
      mediaTypes: ['image']
    }));

    // Toggle video filter
    fireEvent.click(screen.getByText('search.media_type.video'));
    expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
      mediaTypes: ['image', 'video']
    }));

    // Toggle image filter off
    fireEvent.click(screen.getByText('search.media_type.image'));
    expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
      mediaTypes: ['video']
    }));
  });
});
