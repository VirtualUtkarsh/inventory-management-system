import React from 'react';

const TableFilter = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  metadata, 
  filterConfig,
  resultsCount,
  totalCount 
}) => {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    onFilterChange(name, type === 'checkbox' ? checked : value);
  };

  const renderFilterField = (config) => {
    const { key, label, type, options, placeholder } = config;

    switch (type) {
      case 'text':
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="text"
              name={key}
              value={filters[key] || ''}
              onChange={handleInputChange}
              placeholder={placeholder || `Search ${label.toLowerCase()}...`}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case 'select':
        const selectOptions = options || metadata[key] || [];
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select
              name={key}
              value={filters[key] || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All {label}</option>
              {selectOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <label key={key} className="flex items-center">
            <input
              type="checkbox"
              name={key}
              checked={filters[key] || false}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        <button
          onClick={onClearFilters}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Clear All Filters
        </button>
      </div>
      
      {/* Main filter fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {filterConfig.fields.map(renderFilterField)}
      </div>

      {/* Quick filters (checkboxes) */}
      {filterConfig.quickFilters && filterConfig.quickFilters.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {filterConfig.quickFilters.map(renderFilterField)}
        </div>
      )}

      {/* Results summary */}
      {(resultsCount !== undefined && totalCount !== undefined) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {resultsCount} of {totalCount} items
          </p>
        </div>
      )}
    </div>
  );
};

export default TableFilter;