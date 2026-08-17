import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { signAdminAccessToken } from "../../services/jwt";

function toPublicAdmin(admin: { id: string; email: string; role: string; createdAt: Date }) {
  return { id: admin.id, email: admin.email, role: admin.role, createdAt: admin.createdAt };
}

export async function login(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) throw AppError.unauthorized("INVALID_CREDENTIALS", "Incorrect email or password");

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) throw AppError.unauthorized("INVALID_CREDENTIALS", "Incorrect email or password");

  const accessToken = signAdminAccessToken(admin.id, admin.role);
  return { accessToken, admin: toPublicAdmin(admin) };
}

export async function getAdminById(adminId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw AppError.notFound("ADMIN_NOT_FOUND", "Admin not found");
  return toPublicAdmin(admin);
}
