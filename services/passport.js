const passport = require('passport');

module.exports = function initPassport() {
  // Google strategy removed. Use NextAuth in the Next.js frontend for OAuth flows.
  console.log('initPassport: Google OAuth strategy is disabled in this backend.');

  // Keep minimal serialize/deserialize handlers for session compatibility
  passport.serializeUser((user, done) => {
    if (!user) return done(null, null);
    done(null, { id: user.id, type: user.type || 'customer' });
  });

  passport.deserializeUser(async (obj, done) => {
    try {
      if (obj && obj.type === 'customer') {
        const { Customer } = require('../models');
        const customer = await Customer.findByPk(obj.id);
        return done(null, customer || null);
      }
      return done(null, null);
    } catch (err) {
      return done(err);
    }
  });
};
