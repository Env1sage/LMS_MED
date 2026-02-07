import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

function Table<T>({ 
  columns, 
  data, 
  keyExtractor,
  onSort,
  emptyMessage = 'No data available',
  loading = false
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="table-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-container">
        <div className="table-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className={`table ${onSort ? 'table-sortable' : ''}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key}
                onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
                style={{ cursor: column.sortable ? 'pointer' : 'default' }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render 
                    ? column.render(item) 
                    : String((item as any)[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
