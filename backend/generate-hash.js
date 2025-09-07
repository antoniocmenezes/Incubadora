// generate-hash.js
import bcrypt from "bcryptjs";

// senha que você quer criptografar
const password = "admin123";

// gera o hash com fator de custo 10
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log("Senha original:", password);
  console.log("Hash gerado:", hash);
});
