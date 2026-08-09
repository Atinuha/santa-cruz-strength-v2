import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');

// scripts/prerender.mjs fills #root at build time. Calling createRoot on markup
// that is already there throws it away and rebuilds it, which costs a full
// render and shows a blank frame in between. hydrateRoot adopts it instead, so
// the text a crawler reads is the same text the visitor keeps looking at.
//
// The choice is made from the DOM rather than a build flag on purpose: a build
// that skipped prerendering leaves #root empty and falls back on its own, with
// no environment variable to keep in step.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    container,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
