require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'chemarauto_test';
process.env.JWT_SECRET = 'test_secret';
process.env.MAIL_USER = '';
process.env.MAIL_PASS = '';
