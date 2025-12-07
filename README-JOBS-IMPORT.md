# Guide d'importation des métiers

Ce document explique comment importer la hiérarchie des métiers depuis un fichier Excel dans la base de données.

## Structure du modèle de données

Le schéma de base de données utilise un modèle hiérarchique à 4 niveaux pour représenter les métiers :

1. **MAIN_CATEGORY** (Jaune dans Excel) - Ex: "Agriculture et Pêche, Espaces naturels et Espaces verts, Soins aux animaux"
2. **CATEGORY** (Rose dans Excel) - Ex: "Engins agricoles et forestiers"
3. **SUB_CATEGORY** (Orange dans Excel) - Ex: "Conducteur / Conductrice d'engins d'exploitation forestière"
4. **JOB** (Blanc dans Excel) - Les métiers spécifiques

Chaque entrée est liée à un parent, formant ainsi une structure arborescente.

## Format du fichier Excel

Le fichier Excel attendu doit avoir la structure suivante :

- Colonne A, B, C : Codes identifiants (Ex: A 11 01)
- Colonne D : Nom du métier ou de la catégorie
- Colonne E : Code OGR (optionnel)

Les couleurs de cellule dans Excel sont utilisées pour indiquer le niveau hiérarchique.

## Prérequis

1. Assurez-vous que les migrations Prisma ont été appliquées :

```bash
npx prisma migrate dev
```

2. Préparez votre fichier Excel avec la structure appropriée.

## Importation des données

Utilisez la commande suivante pour importer les métiers depuis votre fichier Excel :

```bash
npm run import:jobs -- -f chemin/vers/votre/fichier.xlsx
```

Options disponibles :

- `-f, --file <chemin>` : Chemin vers le fichier Excel (obligatoire)
- `-c, --clear` : Efface les données de métiers existantes avant l'importation (facultatif)

Exemple d'utilisation :

```bash
npm run import:jobs -- -f ./data/metiers.xlsx --clear
```

## Dépannage

Si l'importation échoue ou produit des résultats inattendus :

1. Vérifiez que le format de votre fichier Excel correspond à la structure attendue.
2. Inspectez les messages d'erreur dans la console pour identifier les problèmes spécifiques.
3. Vous pouvez utiliser l'option `--clear` pour réinitialiser les données et réessayer.

## Vérification des données importées

Après l'importation, vous pouvez vérifier les données en exécutant une requête SQL via Prisma :

```typescript
// Exemple de code pour vérifier les métiers importés
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkImportedJobs() {
  // Compter le nombre de métiers par niveau
  const counts = await Promise.all([
    prisma.job.count({ where: { level: 'MAIN_CATEGORY' } }),
    prisma.job.count({ where: { level: 'CATEGORY' } }),
    prisma.job.count({ where: { level: 'SUB_CATEGORY' } }),
    prisma.job.count({ where: { level: 'JOB' } }),
  ]);

  console.log('Nombre de catégories principales:', counts[0]);
  console.log('Nombre de catégories:', counts[1]);
  console.log('Nombre de sous-catégories:', counts[2]);
  console.log('Nombre de métiers:', counts[3]);
  console.log(
    'Total:',
    counts.reduce((a, b) => a + b, 0),
  );
}

checkImportedJobs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```
