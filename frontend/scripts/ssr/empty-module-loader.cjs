/**
 * Turns a stylesheet into nothing for the node bundle.
 *
 * The prerender needs the component tree, not the styles: CSS reaches the page
 * through the link tag webpack already emitted for the browser build, and the
 * markup is identical either way. Feeding real CSS to a node target would only
 * add a css-loader and a chance for the two builds to disagree.
 */
module.exports = function emptyModuleLoader() {
  return 'module.exports = {};';
};
