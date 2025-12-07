# Configuration de la Base de Données PostgreSQL avec Docker

Ce document explique comment démarrer et utiliser la base de données PostgreSQL pour le projet Infiny Backend.

## Prérequis

- Docker et Docker Compose installés sur votre machine
- Node.js et npm installés

## Démarrer la base de données

Pour lancer la base de données PostgreSQL, exécutez la commande suivante à la racine du projet :

```bash
docker-compose up -d
```

Cela démarrera un conteneur PostgreSQL avec les configurations suivantes :

- Port : 5432 (exposé sur l'hôte)
- Utilisateur : postgres
- Mot de passe : postgres
- Base de données : infiny

## Initialiser Prisma

Après avoir démarré la base de données, vous pouvez initialiser votre schéma Prisma avec les commandes suivantes :

```bash
# Installer les dépendances si ce n'est pas déjà fait
npm install

# Générer le client Prisma basé sur votre schéma
npx prisma generate

# Appliquer les migrations (créer les tables dans la base de données)
npx prisma migrate dev --name init
```

## Vérifier la connexion

Pour vérifier que la connexion à la base de données fonctionne correctement, vous pouvez utiliser Prisma Studio :

```bash
npx prisma studio
```

Cela ouvrira une interface web à l'adresse http://localhost:5555 où vous pourrez voir et gérer vos données.

## Arrêter la base de données

Pour arrêter le conteneur PostgreSQL, exécutez :

```bash
docker-compose down
```

Si vous souhaitez également supprimer les volumes (ce qui effacera toutes les données), utilisez :

```bash
docker-compose down -v
```
