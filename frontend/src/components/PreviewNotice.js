import React from 'react';
import { PREVIEW_MODE } from '../utils/previewSafety';

export default function PreviewNotice({ children, testId = 'preview-mode-notice', className = '' }) {
  if (!PREVIEW_MODE) return null;
  return (
    <div className={`scs-preview-notice ${className}`.trim()} role="note" data-testid={testId}>
      <strong>Preview test mode.</strong> {children}
    </div>
  );
}
