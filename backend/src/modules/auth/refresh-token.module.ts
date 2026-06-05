import { Module } from "@nestjs/common";
import { RefreshTokenService } from "./refresh-token.service";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * Standalone module for RefreshTokenService so it can be shared by both
 * AuthModule and UsersModule without re-introducing the
 * UsersModule <-> AuthModule circular dependency.
 *
 * RefreshTokenService only depends on PrismaService + the (global) ConfigService,
 * so it lives happily on its own here.
 */
@Module({
  imports: [PrismaModule],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
