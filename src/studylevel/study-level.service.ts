import { Injectable, Post, Req } from '@nestjs/common';
import { CreateStudyLevelDto } from './dto/create-study-level.dto';
import { UpdateStudyLevelDto } from './dto/update-study-level.dto';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

// Interface pour typer l'utilisateur authentifié
interface AuthenticatedUser {
  id: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  hasProfile?: boolean;
}

@Injectable()
export class StudyLevelService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createStudyLevelDto: CreateStudyLevelDto, @Req() req: Request) {
    const { studyLevel } = createStudyLevelDto;
    const user = req.user as AuthenticatedUser;
    console.log(user);
    console.log(studyLevel);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Récupérer d'abord le profil de l'utilisateur avec son niveau d'études
    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
      include: { studyLevel: true },
    });

    if (!profile) {
      throw new NotFoundException('Profil non trouvé pour cet utilisateur');
    }

    // Vérifier si l'utilisateur a déjà un niveau d'études
    if (profile.studyLevel) {
      // Mettre à jour le niveau d'études existant
      return this.prisma.studyLevel.update({
        where: { id: profile.studyLevel.id },
        data: { type: studyLevel },
      });
    } else {
      // Créer un nouveau niveau d'études
      return this.prisma.studyLevel.create({
        data: {
          type: studyLevel,
          profile: {
            connect: { id: profile.id },
          },
        },
      });
    }
  }
}
