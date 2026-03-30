import { Global, Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';

@Global()
@Module({
  providers: [DriveService],
  controllers: [DriveController],
  exports: [DriveService],
})
export class DriveModule {}
