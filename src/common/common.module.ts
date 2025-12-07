import { Module, Global } from '@nestjs/common';
import { RolesGuard, ThrottlerGuard } from './guards';

@Global()
@Module({
  providers: [RolesGuard, ThrottlerGuard],
  exports: [RolesGuard, ThrottlerGuard],
})
export class CommonModule {}
