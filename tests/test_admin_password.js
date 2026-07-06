import bcrypt from 'bcryptjs';
const hash = "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK";
console.log("admin:", bcrypt.compareSync("admin", hash));
console.log("123456:", bcrypt.compareSync("123456", hash));
console.log("1234:", bcrypt.compareSync("1234", hash));
console.log("admin123:", bcrypt.compareSync("admin123", hash));
console.log("password:", bcrypt.compareSync("password", hash));
