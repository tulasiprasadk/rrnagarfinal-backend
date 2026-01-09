module.exports = function initPassport() {
  try {
    const init = require('../config/passport');
    init();
    console.log('initPassport: passport strategies initialized');
  } catch (e) {
    console.log('initPassport: failed to initialize advanced passport config:', e && e.message ? e.message : e);
  }
};
