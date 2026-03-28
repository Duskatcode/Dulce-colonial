import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [MovementsController],
  providers: [MovementsService],
})
export class MovementsModule {}
