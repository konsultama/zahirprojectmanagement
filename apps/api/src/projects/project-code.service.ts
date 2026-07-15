import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Generates project codes in the format PRJ-YYYY-NNNNN (§7.1.1).
 * NNNNN is a per-year running sequence, zero-padded to 5 digits.
 * Must run inside a transaction to avoid duplicate codes under concurrency.
 */
@Injectable()
export class ProjectCodeService {
  async next(tx: Prisma.TransactionClient, year: number): Promise<string> {
    const prefix = `PRJ-${year}-`;
    const last = await tx.project.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let seq = 1;
    if (last) {
      const tail = last.code.slice(prefix.length);
      const parsed = Number.parseInt(tail, 10);
      if (!Number.isNaN(parsed)) {
        seq = parsed + 1;
      }
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }
}
