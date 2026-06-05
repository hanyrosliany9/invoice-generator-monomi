import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PrismaModule } from "../prisma/prisma.module";
import { RefreshTokenModule } from "../auth/refresh-token.module";

// AuthModule was removed from imports to break a circular dependency:
// UsersModule -> AuthModule -> UsersModule.
// JwtAuthGuard is registered globally via APP_GUARD in AppModule so it
// does not need to be imported here.
// RefreshTokenModule is standalone (Prisma + Config only), so importing it
// here for UsersService's token revocation does NOT re-introduce the cycle.
@Module({
  imports: [PrismaModule, RefreshTokenModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
