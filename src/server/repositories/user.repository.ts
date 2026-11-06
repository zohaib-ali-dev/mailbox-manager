import type { PrismaClient, User } from '@/generated/prisma/client';
import type { Db } from '@/server/db/types';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string, tx?: Db): Promise<User | null> {
    return (tx ?? this.prisma).user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string, tx?: Db): Promise<User | null> {
    return (tx ?? this.prisma).user.findUnique({ where: { id } });
  }
}
