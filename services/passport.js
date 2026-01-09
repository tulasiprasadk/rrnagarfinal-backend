const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Customer } = require('../models');

module.exports = function initPassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    console.log('Google OAuth not configured (missing env vars)');
    return;
  }

  passport.serializeUser((user, done) => {
    done(null, { id: user.id, type: 'customer' });
  });

  passport.deserializeUser(async (obj, done) => {
    try {
      if (obj && obj.type === 'customer') {
        const customer = await Customer.findByPk(obj.id);
        return done(null, customer || null);
      }
      return done(null, null);
    } catch (err) {
      return done(err);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
          const name = profile.displayName || (profile.name && `${profile.name.givenName || ''} ${profile.name.familyName || ''}`) || null;

          if (!email) return done(new Error('No email in Google profile'));

          let customer = await Customer.findOne({ where: { email } });
          if (!customer) {
            customer = await Customer.create({ email, name });
          } else {
            // update name if missing
            if (!customer.name && name) await customer.update({ name });
          }

          return done(null, customer);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
};
