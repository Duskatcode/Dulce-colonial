import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AlertsGateway } from './alerts.gateway';
import { AlertsService } from './alerts.service';

@Module({
  imports: [PrismaModule],
  providers: [AlertsService, AlertsGateway],
  exports: [AlertsService, AlertsGateway],
})
export class AlertsModule {}
