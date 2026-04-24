import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeBalance } from '../entities/employee-balance.entity';
import { BalancesService } from './balances.service';
import { BalancesController } from './balances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeBalance])],
  providers: [BalancesService],
  controllers: [BalancesController],
  exports: [BalancesService],
})
class BalancesModule {}
export { BalancesModule };
