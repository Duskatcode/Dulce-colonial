import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { InventoryService } from './inventory.service';
import { FilterInventoryDto } from './dto/filter-inventory.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { AdjustQuantityDto } from './dto/adjust-quantity.dto';

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() filters: FilterInventoryDto) {
    return this.inventoryService.findAll(filters);
  }

  @Get('units')
  getUnits() {
    return this.inventoryService.getUnits();
  }

  @Get('below-min')
  getRawBelowMin() {
    return this.inventoryService.getRawBelowMinimum();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OPERADOR)
  create(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERADOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.inventoryService.update(id, dto);
  }

  @Patch(':id/adjust')
  @Roles(Role.ADMIN, Role.OPERADOR)
  adjust(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustQuantityDto,
  ) {
    return this.inventoryService.adjustQuantity(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.remove(id);
  }
}
