import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = /\.(pdf|docx?|xlsx?|jpe?g|png)$/i;

@Controller('files')
export class FilesController {
  /** Upload a file (max 10 MB, §7.1.1 allowed types). Returns a URL to reference. */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        ALLOWED.test(file.originalname)
          ? cb(null, true)
          : cb(new BadRequestException('Tipe file tidak didukung (pdf, doc, xls, jpg, png).'), false),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user?: RequestUser) {
    if (!user) throw new UnauthorizedException('Otentikasi diperlukan.');
    if (!file) throw new BadRequestException('File tidak ada.');
    return {
      url: `/files/${file.filename}`,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /** Serve a stored file (unguessable UUID filename acts as the access token). */
  @Get(':name')
  download(@Param('name') name: string, @Res() res: Response) {
    const safe = basename(name); // guard against path traversal
    const path = join(UPLOAD_DIR, safe);
    if (!existsSync(path)) throw new NotFoundException('File tidak ditemukan.');
    res.sendFile(path);
  }
}
