import { UserType, ReferralStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  type: UserType;
  isActive: boolean;
  isVerified: boolean;
  affiliationCount?: number;

  // Ces champs pourraient être optionnels selon votre implémentation
  profile?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };

  sentRequests?: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: ReferralStatus;
    message?: string | null; // Ajusté pour correspondre à Prisma (String?)
    responseDate?: Date | null; // Ajusté pour correspondre à Prisma (DateTime?)
    responseMessage?: string | null; // Ajusté pour correspondre à Prisma (String?)
    referrerId?: string | null; // Ajusté pour correspondre à Prisma (String?)
  }[];
}
