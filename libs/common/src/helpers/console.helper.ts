// override console methods to add timestamp
const METHODS = ['log', 'warn', 'error', 'info', 'debug'];
METHODS.forEach(method => {
  const original = console[method];
  console[method] = (...args) => {
    const ts = new Date().toISOString();
    original.call(console, `[${ts}]`, ...args);
  };
});