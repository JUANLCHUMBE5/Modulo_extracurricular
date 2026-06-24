import bcrypt from 'bcryptjs';

const hash = "$2b$10$Lu8tyQwb0yd3KzX4l8VFqOeS/ByL44NQ0TfXetVGBE9VqpCv3SsaK";
const testPassword = "1234";

const match = bcrypt.compareSync(testPassword, hash);
console.log(`Does password "1234" match the hash? ${match}`);
