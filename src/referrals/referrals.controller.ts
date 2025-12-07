import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UnauthorizedException,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserType, ReferralStatus } from '@prisma/client';
import { Roles } from '../common/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { CreateReferralWithMailDto } from './dto/create-referral-with-mail.dto';
@ApiTags('Parrainages')
@ApiBearerAuth()
@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.USER, UserType.RECOMMENDER)
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create')
  @ApiOperation({
    summary: 'Créer une demande de parrainage',
    description:
      'Permet à un utilisateur de demander à être parrainé par un autre utilisateur',
  })
  @ApiBody({
    type: CreateReferralDto,
    description: "Données pour la création d'une demande de parrainage",
  })
  @ApiResponse({
    status: 201,
    description: 'Demande de parrainage créée avec succès',
  })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  @ApiBadRequestResponse({
    description: 'Parrain non trouvé ou données invalides',
  })
  @ApiConflictResponse({
    description: 'Une demande de parrainage existe déjà entre ces utilisateurs',
  })
  create(@Body() createReferralDto: CreateReferralDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.create(createReferralDto, req);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister toutes les demandes de parrainage',
    description:
      "Récupère toutes les demandes de parrainage liées à l'utilisateur connecté",
  })
  @ApiOkResponse({
    description: 'Liste des demandes de parrainage récupérée avec succès',
  })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  findAll(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.findAll(user.id);
  }

  @Get('received')
  @ApiOperation({
    summary: 'Lister les demandes de parrainage reçues',
    description:
      "Récupère toutes les demandes de parrainage pour lesquelles l'utilisateur connecté est le parrain potentiel",
  })
  @ApiOkResponse({
    description:
      'Liste des demandes de parrainage reçues récupérée avec succès',
  })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  findReceived(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.findReceived(user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Statistiques des demandes de parrainage',
    description:
      "Obtenir des statistiques sur les demandes de parrainage de l'utilisateur",
  })
  @ApiOkResponse({
    description: 'Statistiques récupérées avec succès',
  })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  getStats(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.getStats(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une demande de parrainage spécifique',
    description: "Récupère les détails d'une demande de parrainage par son ID",
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant de la demande de parrainage',
    type: 'string',
  })
  @ApiOkResponse({ description: 'Demande de parrainage récupérée avec succès' })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  @ApiBadRequestResponse({
    description: 'Demande de parrainage non trouvée ou accès non autorisé',
  })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une demande de parrainage',
    description: "Permet au parrain d'accepter une demande de parrainage",
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant de la demande de parrainage',
    type: 'string',
  })
  @ApiBody({
    type: UpdateReferralDto,
    description: 'Données pour la mise à jour de la demande de parrainage',
  })
  @ApiOkResponse({
    description: 'Demande de parrainage mise à jour avec succès',
  })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  @ApiBadRequestResponse({
    description:
      'Demande de parrainage non trouvée ou seul le parrain peut mettre à jour cette demande',
  })
  update(
    @Param('id') id: string,
    @Body() updateReferralDto: UpdateReferralDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.update(id, updateReferralDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une demande de parrainage',
    description:
      'Permet au demandeur de supprimer une demande de parrainage en attente',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant de la demande de parrainage',
    type: 'string',
  })
  @ApiOkResponse({ description: 'Demande de parrainage supprimée avec succès' })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  @ApiBadRequestResponse({
    description:
      'Demande de parrainage non trouvée ou vous ne pouvez supprimer que vos propres demandes en attente',
  })
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.remove(id, user.id);
  }

  @Get(':id/invitation-link')
  @ApiOperation({
    summary: "Générer un lien d'acceptation direct",
    description:
      'Génère un lien qui peut être envoyé par email pour accepter directement une demande de parrainage',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant de la demande de parrainage',
    type: 'string',
  })
  @ApiOkResponse({
    description: "Lien d'acceptation généré avec succès",
  })
  @ApiUnauthorizedResponse({ description: 'Utilisateur non authentifié' })
  @ApiBadRequestResponse({
    description: 'Demande de parrainage non trouvée ou accès non autorisé',
  })
  generateInvitationLink(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('baseUrl') baseUrl: string = 'http://localhost:3000',
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException();
    return this.referralsService.generateInvitationLink(id, baseUrl);
  }

  @Post('create-with-mail')
  @ApiOperation({
    summary: 'Créer une demande de parrainage avec un email',
    description: 'Crée une demande de parrainage avec un email',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createWithMail(@Body() createReferralWithMailDto: CreateReferralWithMailDto, @Req() req: Request) {
    return this.referralsService.createWithMail(createReferralWithMailDto, req);
  }
}
