import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../../prisma/services/user.service';

@Injectable()
export class IsVerifiedGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    const user = await this.usersService.user({ id: userId });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Veuillez vérifier votre email pour accéder à cette ressource',
      );
    }

    return true;
  }
}
