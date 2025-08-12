const bcrypt = require('bcrypt');

// !! IMPORTANT: Replace "yourSecurePassword" with the actual password you want to use !!
const password = "GrowthTeam123#";

const saltRounds = 12;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error("Error hashing password:", err);
    return;
  }
  console.log("Your hashed password is:");
  console.log(hash);
});