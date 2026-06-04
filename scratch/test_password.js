import bcrypt from 'bcryptjs';

const hash = "$2b$10$PpJCJka4umG6XmCQS.oGHOVzwgP9tv9r1akWpeMuAVBkP.prx5l7.";
const testPass = "1234";

console.log("Is 1234 valid?", bcrypt.compareSync(testPass, hash));
