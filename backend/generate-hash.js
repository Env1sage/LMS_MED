const bcrypt = require('bcrypt');

const password = 'Password123!';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Password:', password);
    console.log('Hash:', hash);
  }
  process.exit(0);
});
