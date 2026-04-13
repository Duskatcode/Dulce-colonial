import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ActivityService],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
