import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import { getErrorMessage } from "../../../common/utils/error-handling.util";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Log authentication attempts for debugging
    this.logger.debug(`Auth attempt for ${request.method} ${request.url}`, {
      hasAuthHeader: !!authHeader,
      authHeaderType: authHeader?.split(" ")[0],
    });

    try {
      return super.canActivate(context);
    } catch (error) {
      this.logger.error(
        `Authentication failed for ${request.method} ${request.url}:`,
        getErrorMessage(error),
      );
      throw error;
    }
  }

  override handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ) {
    const request = context.switchToHttp().getRequest();

    if (err) {
      this.logger.error(
        `JWT Auth Error for ${request.method} ${request.url}:`,
        getErrorMessage(err),
      );
      throw new UnauthorizedException(
        "Authentication failed: " + getErrorMessage(err),
      );
    }

    if (!user) {
      let message = "Token tidak valid atau telah kedaluwarsa";

      if (info) {
        if (info.name === "TokenExpiredError") {
          message = "Token telah kedaluwarsa";
        } else if (info.name === "JsonWebTokenError") {
          message = "Token tidak valid";
        } else if (info.name === "NotBeforeError") {
          message = "Token belum aktif";
        } else if (info.message) {
          message = info.message;
        }
      }

      this.logger.warn(
        `Authentication failed for ${request.method} ${request.url}: ${message}`,
        {
          info: info?.name || "Unknown",
          userAgent: request.headers["user-agent"],
        },
      );

      throw new UnauthorizedException(message);
    }

    this.logger.debug(
      `User authenticated successfully: ${user.email} (${user.id})`,
    );
    return user;
  }
}
