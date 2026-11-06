import { z } from 'zod';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '@/server/auth/password';
import { InvalidCredentialsError } from '@/server/domain/errors';
import { parseOrThrow } from '@/server/domain/validation';
import type { Viewer } from '@/server/domain/viewer';
import { toUserDto } from '@/server/mappers/user.mapper';
import type { UserRepository } from '@/server/repositories/user.repository';
import { loginSchema } from '@/shared/schemas/auth.schema';
import type { UserDto } from '@/shared/types/auth.dto';

const userIdSchema = z.uuid();

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  /**
   * One generic error for an unknown email and a wrong password. For an unknown email a bcrypt
   * compare still runs against a dummy hash, so response time does not reveal which emails exist.
   */
  async login(rawInput: unknown): Promise<UserDto> {
    const input = parseOrThrow(loginSchema, rawInput);
    const user = await this.users.findByEmail(input.email);
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) throw new InvalidCredentialsError();
    return toUserDto(user);
  }

  /** The current user for a session subject, or null when the user no longer exists. */
  async getViewer(userId: string): Promise<Viewer | null> {
    if (!userIdSchema.safeParse(userId).success) return null;
    const user = await this.users.findById(userId);
    return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
  }
}
