import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
