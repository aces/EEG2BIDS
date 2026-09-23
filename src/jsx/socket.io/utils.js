/* eslint-disable no-console */
// Log on development and staging only.
const dev = process.env.NODE_ENV !== 'production';

export const warning = (...args) => dev && console.error(...args);

export const debug = (...args) => dev && console.debug(...args);
