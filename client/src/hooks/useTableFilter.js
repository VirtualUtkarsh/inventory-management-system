import { useState, useEffect, useMemo } from 'react';

const useTableFilter = (data, filterConfig, initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [metadata, setMetadata] = useState({});

  // Extract metadata from data
  useEffect(() => {
    if (!data || data.length === 0) return;

    const newMetadata = {};
    
    // Extract unique values for each filterable field
    filterConfig.fields.forEach(field => {
      if (field.type === 'select' && !field.options) {
        const uniqueValues = [...new Set(
          data.map(item => item[field.key]).filter(Boolean)
        )].sort();
        newMetadata[field.key] = uniqueValues;
      }
    });

    setMetadata(newMetadata);
  }, [data, filterConfig.fields]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    filterConfig.fields.forEach(field => {
      const filterValue = filters[field.key];
      if (!filterValue) return;

      switch (field.type) {
        case 'text':
          const searchTerm = filterValue.toLowerCase();
          if (field.searchFields) {
            // Search across multiple fields
            filtered = filtered.filter(item =>
              field.searchFields.some(searchField =>
                (item[searchField] || '').toLowerCase().includes(searchTerm)
              )
            );
          } else {
            // Search in single field
            filtered = filtered.filter(item =>
              (item[field.key] || '').toLowerCase().includes(searchTerm)
            );
          }
          break;

        case 'select':
          filtered = filtered.filter(item => {
            const itemValue = item[field.key];
            if (field.key === 'color' && itemValue) {
              // Special handling for color field that might contain multiple colors
              return itemValue.includes(filterValue);
            }
            return itemValue === filterValue;
          });
          break;

        case 'checkbox':
          if (filterValue) {
            if (field.condition) {
              // Custom condition function
              filtered = filtered.filter(field.condition);
            }
          }
          break;
      }
    });

    // Apply quick filters (checkboxes)
    if (filterConfig.quickFilters) {
      filterConfig.quickFilters.forEach(quickFilter => {
        if (filters[quickFilter.key] && quickFilter.condition) {
          filtered = filtered.filter(quickFilter.condition);
        }
      });
    }

    return filtered;
  }, [data, filters, filterConfig]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  return {
    filters,
    filteredData,
    metadata,
    handleFilterChange,
    clearFilters
  };
};

export default useTableFilter;