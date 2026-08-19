// Feature flags: client-side gates for unreleased pages.
// Set in .env as REACT_APP_ENABLE_FEATURE_NAME=true to activate.

export const FEATURES = {
  volunteerPage: process.env.REACT_APP_ENABLE_VOLUNTEER_PAGE === 'true',
};
