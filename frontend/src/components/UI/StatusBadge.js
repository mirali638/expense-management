import React from 'react';
import { clsx } from 'clsx';

const StatusBadge = ({ status, className = '' }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          label: 'Pending',
          className: 'status-badge status-pending'
        };
      case 'approved':
        return {
          label: 'Approved',
          className: 'status-badge status-approved'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'status-badge status-rejected'
        };
      case 'partially_approved':
        return {
          label: 'Partially Approved',
          className: 'status-badge bg-blue-100 text-blue-800'
        };
      default:
        return {
          label: status || 'Unknown',
          className: 'status-badge bg-gray-100 text-gray-800'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={clsx(config.className, className)}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
