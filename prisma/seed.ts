import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("admin", 10);
  await prisma.user.upsert({
    where: { email: "admin" },
    update: {},
    create: {
      email: "admin",
      password: adminPassword,
      name: "Administrador",
      role: "admin",
    },
  });

  const centro = await prisma.puntoAcopio.upsert({
    where: { id: "seed-punto-centro" },
    update: {},
    create: {
      id: "seed-punto-centro",
      nombre: "Centro Comunitario Centro",
      direccion: "Av. Juárez 123, Centro",
      zona: "Centro",
      materiales: "papel, cartón, plástico PET, aluminio",
      responsable: "María López",
      contacto: "555-100-2000",
      activo: true,
    },
  });

  const norte = await prisma.puntoAcopio.upsert({
    where: { id: "seed-punto-norte" },
    update: {},
    create: {
      id: "seed-punto-norte",
      nombre: "Parque Zona Norte",
      direccion: "Blvd. Norte 456",
      zona: "Norte",
      materiales: "papel, cartón, vidrio",
      responsable: "Juan Pérez",
      contacto: "555-100-3000",
      activo: true,
    },
  });

  const hoy = new Date();
  const en7dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hace7dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);

  await prisma.fechaAcopio.upsert({
    where: { id: "seed-fecha-centro-1" },
    update: {},
    create: {
      id: "seed-fecha-centro-1",
      puntoAcopioId: centro.id,
      fecha: en7dias,
      horaInicio: "09:00",
      horaFin: "13:00",
      estado: "programada",
      notas: "Jornada mensual de acopio",
    },
  });

  await prisma.fechaAcopio.upsert({
    where: { id: "seed-fecha-centro-2" },
    update: {},
    create: {
      id: "seed-fecha-centro-2",
      puntoAcopioId: centro.id,
      fecha: hace7dias,
      horaInicio: "09:00",
      horaFin: "13:00",
      estado: "realizada",
      notas: "Se recolectaron 120kg de papel y cartón",
    },
  });

  await prisma.fechaAcopio.upsert({
    where: { id: "seed-fecha-norte-1" },
    update: {},
    create: {
      id: "seed-fecha-norte-1",
      puntoAcopioId: norte.id,
      fecha: en7dias,
      horaInicio: "10:00",
      horaFin: "14:00",
      estado: "programada",
    },
  });

  console.log("Seed completado: usuario admin/admin + puntos y fechas de ejemplo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
