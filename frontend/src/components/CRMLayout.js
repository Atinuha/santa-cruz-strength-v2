import React, { useEffect } from 'react';

/**
 * CRMLayout - wraps all staff/admin pages.
 * Adds 'crm-page' class to body so dark CSS variables kick in.
 * Removes it on unmount so public pages get light theme back.
 */
export default function CRMLayout({ children }) {
  useEffect(() => {
    document.body.classList.add('crm-page');
    document.body.style.backgroundColor = '#0C1420';
    document.body.style.color = '#F0F4FF';
    return () => {
      document.body.classList.remove('crm-page');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  return (
    <div className="crm-root" style={{
      minHeight: '100vh',
      backgroundColor: '#0C1420',
      color: '#F0F4FF',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {children}
    </div>
  );
}
