import {
  Controller, Get, Post, Body,
  Query, UseGuards, ParseIntPipe,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('status')
  @ApiOperation({ summary: 'Estado actual de la caja y saldo' })
  getStatus() {
    return this.cashService.getStatus();
  }

  @Get('summary')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Resumen completo de la caja abierta' })
  getSummary(@Query('cashRegisterId') id?: string) {
    return this.cashService.getSummary(id ? +id : undefined);
  }

  @Get('registers')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Historial de cajas (solo ADMIN)' })
  findRegisters(
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.cashService.findRegisters(
      page  ? +page  : 1,
      limit ? +limit : 10,
    );
  }

  @Get('transactions')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Listar transacciones con filtros' })
  findTransactions(@Query() filters: FilterTransactionsDto) {
    return this.cashService.findTransactions(filters);
  }

  @Post('open')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Abrir caja con saldo inicial' })
  open(
    @Body() dto: CreateTransactionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.cashService.openRegister(dto as any, userId);
  }

  @Post('close')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Cerrar caja con conteo físico' })
  close(
    @Body() dto: CloseRegisterDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.cashService.closeRegister(dto, userId);
  }

  @Post('transaction')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Registrar movimiento de caja' })
  createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.cashService.createTransaction(dto, userId);
  }
}