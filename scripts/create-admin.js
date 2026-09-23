// Crea (o restablece) un administrador directamente en la base de datos.
// Uso interactivo:      npm run create-admin
// Uso no interactivo:   ADMIN_USERNAME=... ADMIN_PASSWORD=... [ADMIN_NAME=...] npm run create-admin
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../src/config/prisma.js';

const RECOMMENDED_LENGTH = 10;

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._@+-]{3,160}$/, 'Usuario no válido: 3 o más caracteres (letras, números, . _ - @)'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres').max(128),
});

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Oculta lo que se escribe (muestra "*")
      rl._writeToOutput = (str) => {
        if (str.includes(question)) rl.output.write(str);
        else if (str === '\r\n' || str === '\n') rl.output.write(str);
        else rl.output.write('*'.repeat(str.length));
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const nonInteractive = Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);

async function collect() {
  if (nonInteractive) {
    return {
      name: process.env.ADMIN_NAME || 'Administrador',
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    };
  }
  console.log('\n=== Crear administrador ===\n');
  const name = (await ask('Nombre (Enter = Administrador): ')) || 'Administrador';
  const username = await ask('Usuario (o email): ');
  const password = await ask('Contraseña: ', { hidden: true });
  const confirm = await ask('Confirmar contraseña: ', { hidden: true });
  if (password !== confirm) throw new Error('Las contraseñas no coinciden');
  return { name, username, password };
}

async function main() {
  const parsed = schema.safeParse(await collect());
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { name, username, password } = parsed.data;
  if (password.length < RECOMMENDED_LENGTH) {
    console.warn(
      `⚠ Contraseña corta (${password.length} caracteres). Se recomiendan al menos ${RECOMMENDED_LENGTH}; ` +
        'cámbiala desde Panel → Administradores antes de publicar el sitio.',
    );
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    const answer = nonInteractive
      ? 's'
      : await ask(`Ya existe el administrador "${username}". ¿Restablecer su contraseña y activarlo? (s/N): `);
    if (answer.trim().toLowerCase() !== 's') {
      console.log('Operación cancelada.');
      return;
    }
    await prisma.adminUser.update({
      where: { username },
      data: { name, passwordHash, isActive: true, tokenVersion: { increment: 1 } },
    });
    console.log(`\n✔ Administrador "${username}" actualizado.`);
    return;
  }

  await prisma.adminUser.create({ data: { name, username, passwordHash } });
  console.log(`\n✔ Administrador "${username}" creado correctamente.`);
}

main()
  .catch((err) => {
    console.error(`\n✖ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
