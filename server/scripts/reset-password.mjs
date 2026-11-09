// Postavlja novu lozinku korisniku (npr. ako je zaboravljena).
// Upotreba: node scripts/reset-password.mjs <korisnicko-ime> <nova-lozinka>
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 6) {
  console.error("Upotreba: node scripts/reset-password.mjs <korisnicko-ime> <nova-lozinka (min. 6 znakova)>");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const all = await prisma.user.findMany({ select: { username: true } });
    console.error(`Korisnik "${username}" ne postoji. Postojeci: ${all.map((u) => u.username).join(", ") || "(nema)"}`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  console.log(`Lozinka za "${username}" je promijenjena.`);
} finally {
  await prisma.$disconnect();
}
