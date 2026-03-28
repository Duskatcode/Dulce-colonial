import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
