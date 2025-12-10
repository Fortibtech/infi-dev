import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { User } from '@prisma/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/database/prisma.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient;
  constructor(
    private supabaseService: SupabaseService,
    private prisma: PrismaService,
  ) {
    this.supabase = supabaseService.getClient();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifier si la route est marquée comme publique
    const request = (
      context.switchToHttp() as { getRequest: () => Request }
    ).getRequest();
    const isPublicRoute =
      request.url === '/referrals/respond' ||
      request.url.startsWith('/referrals/respond?');

    // Si la route est publique, on permet l'accès sans authentification
    if (isPublicRoute) {
      return true;
    }
    const authHeader = (request.headers as { authorization?: string })[
      'authorization'
    ];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split(' ')[1];

      const { data, error } = await this.supabase.auth.getUser(idToken);

      if (error || !data.user) {
        console.error(
          `Échec de l'authentification Supabase dans le guard. Détails: ${error?.message}`,
          idToken,
        );
        // Si l'authentification Supabase échoue, on bloque l'accès
        return false;
      }
      const prismaUser = await this.prisma.user.findUnique({
        where: { email: data.user.email },
      });
      (request as { user?: User | null }).user = prismaUser;

      return true;
    }
    return false;
  }
}
