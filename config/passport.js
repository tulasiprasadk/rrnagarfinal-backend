const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Customer, Supplier } = require('../models');

module.exports = function initPassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.BACKEND_URL) {
    console.log('Google OAuth not configured (missing env vars) - skipping Google strategies');
    return;
  }

  // Serialize / deserialize entire minimal user object into session
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  // Supplier strategy
  passport.use(
    'google-supplier',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/supplier/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value && profile.emails[0].value.toLowerCase()) || null;
          const name = profile.displayName || null;

          if (!email) return done(new Error('No email in Google profile'));

          let supplier = await Supplier.findOne({ where: { email } });
          let isNew = false;
          if (!supplier) {
            supplier = await Supplier.create({ email, name, status: 'pending' });
            isNew = true;
          }

          const userObj = {
            id: supplier.id,
            role: 'supplier',
            status: supplier.status || (isNew ? 'pending' : 'pending'),
            email: supplier.email,
          };

          return done(null, userObj);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Customer strategy
  passport.use(
    'google-customer',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/customer/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value && profile.emails[0].value.toLowerCase()) || null;
          const name = profile.displayName || null;

          if (!email) return done(new Error('No email in Google profile'));

          let customer = await Customer.findOne({ where: { email } });
          let isNew = false;
          let status = 'approved';
          if (!customer) {
            customer = await Customer.create({ email, name });
            isNew = true;
            status = 'pending';
          }

          const userObj = {
            id: customer.id,
            role: 'customer',
            status,
            email: customer.email,
          };

          return done(null, userObj);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
};
