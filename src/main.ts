import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as passport from 'passport';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import { ThrottlerGuard } from './common/guards';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activer Helmet (protection HTTP headers)
  app.use(helmet());

  // Configuration spéciale pour les webhooks Stripe
  app.use('/stripe/events', bodyParser.raw({ type: 'application/json' }));

  // Configurer cookie-parser
  app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret'));

  // Configurer body-parser standard pour les autres routes
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Activer la validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Appliquer le ThrottlerGuard globalement
  const throttlerGuard = app.get(ThrottlerGuard);
  app.useGlobalGuards(throttlerGuard);

  // Configurer les sessions
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 60000 * 60, // 1 heure
      },
    }),
  );

  // Initialiser Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configurer CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  // Configuration de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Infiny Backend')
    .setDescription(
      "Documentation complète de l'API avec authentification, utilisateurs et profils",
    )
    .setVersion('1.0')
    .addTag(
      'Authentification',
      "Endpoints d'authentification et gestion des utilisateurs",
    )
    .addTag('Utilisateurs', 'Gestion des utilisateurs')
    .addTag('Profils', 'Gestion des profils utilisateurs')
    .addTag('Stripe', 'Intégration des paiements avec Stripe')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Entrez votre token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(
    `Documentation Swagger disponible sur: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
