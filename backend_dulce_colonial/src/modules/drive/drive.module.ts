import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DriveService],
  controllers: [DriveController],
  exports: [DriveService],
})
export class DriveModule {}
