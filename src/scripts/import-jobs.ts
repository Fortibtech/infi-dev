import * as XLSX from 'xlsx';
import { PrismaClient, JobLevel } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Interface representing a row in the Excel file
interface JobExcelRow {
  A?: string; // Column A (identifiers start)
  B?: string; // Column B (identifiers part)
  C?: string; // Column C (identifiers part)
  D?: string; // Column D (job name)
  E?: string; // Column E (OGR code)
  [key: string]: any; // Pour capturer toutes les autres colonnes potentielles
}

// Since we can't easily get cell colors from xlsx directly,
// we'll use patterns in the data structure to identify levels
async function importJobsFromExcel(filePath: string) {
  try {
    console.log(`Reading Excel file from: ${filePath}`);

    // Load the Excel file with more options for better compatibility
    const workbook = XLSX.readFile(filePath, {
      type: 'binary',
      cellFormula: false,
      cellHTML: false,
      cellDates: true,
    });

    console.log(`Sheets in workbook: ${workbook.SheetNames.join(', ')}`);

    // Assume data is in the first sheet
    const targetSheetName = 'Arbo Principale 24-06-2024';
    const sheetName = workbook.SheetNames.find(
      (name) => name === targetSheetName,
    );

    if (!sheetName) {
      console.error(
        `Error: Sheet named '${targetSheetName}' not found in the Excel file.`,
      );
      console.error(`Available sheets: ${workbook.SheetNames.join(', ')}`);
      await prisma.$disconnect();
      return;
    }
    console.log(`Using sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Get worksheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`Worksheet range: ${worksheet['!ref']}`);
    console.log(`Number of rows in sheet: ${range.e.r - range.s.r + 1}`);

    // Convert sheet to JSON with more options
    const jsonData: JobExcelRow[] = XLSX.utils.sheet_to_json<JobExcelRow>(
      worksheet,
      {
        header: 'A', // Use letter headers
        defval: '', // Default empty cells to empty string instead of undefined
        blankrows: false, // Skip blank rows
        raw: false, // Convert values to appropriate types
      },
    );

    console.log(`Found ${jsonData.length} rows of data to process.`);

    // Log some sample data for debugging
    console.log(
      `First 3 rows sample:`,
      jsonData.slice(0, 3).map((row) => ({
        A: row.A,
        B: row.B,
        C: row.C,
        D: row.D
          ? row.D.substring(0, 50) + (row.D.length > 50 ? '...' : '')
          : '',
        E: row.E,
      })),
    );

    // Track parents for each level
    let currentParents: Record<JobLevel, string | null> = {
      [JobLevel.MAIN_CATEGORY]: null,
      [JobLevel.CATEGORY]: null,
      [JobLevel.SUB_CATEGORY]: null,
      [JobLevel.JOB]: null,
    };

    // First, clear existing data if CLEAR_DATA env var is set to true
    if (process.env.CLEAR_DATA === 'true') {
      console.log('Clearing existing job data...');
      await prisma.job.deleteMany({});
    }

    // Store previous rows to help determine the level structure
    let prevRow: JobExcelRow | null = null;

    // Track statistics for summary
    const stats = {
      total: 0,
      mainCategories: 0,
      categories: 0,
      subCategories: 0,
      jobs: 0,
      skipped: 0,
      errors: 0,
    };

    // Process each row
    for (const row of jsonData) {
      // Skip header rows or empty rows
      if (!row.D || row.D === 'D' || row.D.trim() === '') {
        prevRow = row;
        stats.skipped++;
        continue;
      }

      // Determine level by analyzing the pattern
      const rowLevel = determineLevel(row, prevRow);

      if (!rowLevel) {
        console.warn(
          `Couldn't determine level for row: ${JSON.stringify({
            A: row.A,
            B: row.B,
            C: row.C,
            D: row.D?.substring(0, 50) + '...',
            E: row.E,
          })}`,
        );
        prevRow = row;
        stats.skipped++;
        continue;
      }

      // Construct identifier from columns A, B, C (if present)
      const identifier = [row.A, row.B, row.C].filter(Boolean).join(' ');

      try {
        // Create the job record
        const jobRecord = await prisma.job.create({
          data: {
            name: row.D.trim(),
            code: row.E?.toString(),
            identifiers: identifier || null,
            level: rowLevel,
            parentId: getParentId(rowLevel, currentParents),
          },
        });

        // Update the current parent for this level
        currentParents[rowLevel] = jobRecord.id;

        // Clear all lower level parents
        if (rowLevel === JobLevel.MAIN_CATEGORY) {
          currentParents[JobLevel.CATEGORY] = null;
          currentParents[JobLevel.SUB_CATEGORY] = null;
          currentParents[JobLevel.JOB] = null;
          stats.mainCategories++;
        } else if (rowLevel === JobLevel.CATEGORY) {
          currentParents[JobLevel.SUB_CATEGORY] = null;
          currentParents[JobLevel.JOB] = null;
          stats.categories++;
        } else if (rowLevel === JobLevel.SUB_CATEGORY) {
          currentParents[JobLevel.JOB] = null;
          stats.subCategories++;
        } else {
          stats.jobs++;
        }

        stats.total++;

        // Log less frequently to avoid console spam
        if (stats.total % 100 === 0 || stats.total < 10) {
          console.log(
            `Created job record ${stats.total}: ${jobRecord.name} (${rowLevel})`,
          );
        }
      } catch (dbError) {
        console.error(
          `Error inserting row: ${JSON.stringify({
            A: row.A,
            B: row.B,
            C: row.C,
            D: row.D?.substring(0, 50) + '...',
            E: row.E,
          })}`,
          dbError,
        );
        stats.errors++;
      }

      prevRow = row;
    }

    console.log('Job data import completed successfully.');
    console.log('Import statistics:');
    console.log(`- Total records created: ${stats.total}`);
    console.log(`- Main categories: ${stats.mainCategories}`);
    console.log(`- Categories: ${stats.categories}`);
    console.log(`- Sub-categories: ${stats.subCategories}`);
    console.log(`- Jobs: ${stats.jobs}`);
    console.log(`- Skipped rows: ${stats.skipped}`);
    console.log(`- Errors: ${stats.errors}`);
  } catch (error) {
    console.error('Error importing from Excel:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from Prisma.');
  }
}

// Helper function to determine job level based on patterns
function determineLevel(
  row: JobExcelRow,
  prevRow: JobExcelRow | null,
): JobLevel | null {
  if (!row.D) return null;
  const name = row.D.trim();
  const hasA = row.A && row.A.toString().trim() !== '';
  const hasB = row.B && row.B.toString().trim() !== '';
  const hasC = row.C && row.C.toString().trim() !== '';

  if (!name || name === 'D') return null;

  // --- REVISED ORDER AND LOGIC V3 ---
  // Based on feedback: Rows with only Code A are MAIN_CATEGORY

  // 1. Check for JOB (White): Requires A, B, and C (Most specific)
  if (hasA && hasB && hasC) {
    return JobLevel.JOB;
  }

  // 2. Check for SUB_CATEGORY (Orange): Requires A and B, but not C
  if (hasA && hasB && !hasC) {
    return JobLevel.SUB_CATEGORY;
  }

  // 3. Check for MAIN_CATEGORY (Yellow/Pink?): Requires ONLY A, but not B and not C
  // User feedback indicates these (previously detected as CATEGORY) should be MAIN_CATEGORY.
  if (hasA && !hasB && !hasC) {
    console.log(
      `Info: Classifying '${name.substring(0, 50)}' as MAIN_CATEGORY (only code A present).`,
    );
    return JobLevel.MAIN_CATEGORY;
    // The distinction based on name patterns for this case is removed based on feedback.
  }

  // 4. Check for MAIN_CATEGORY (Yellow) - For those with NO codes AT ALL
  if (!hasA && !hasB && !hasC) {
    // Use name patterns ONLY for rows with absolutely no codes.
    const isLikelyMainCategoryByName =
      name.includes('Agriculture et Pêche') ||
      name.includes('Espaces naturels et espaces verts') ||
      name.includes('Soins aux animaux') ||
      name.includes('INDUSTRIES') || // Add other specific top-level names
      (name === name.toUpperCase() && name.length > 10 && !name.includes('/'));

    if (isLikelyMainCategoryByName) {
      return JobLevel.MAIN_CATEGORY;
    }
    // If no codes and doesn't match main names -> Ambiguous
    console.warn(
      `Ambiguous level (no codes, not main category name): ${name.substring(0, 50)}`,
    );
    return JobLevel.JOB; // Defaulting ambiguous no-code entries to JOB
  }

  // --- Fallback / Catch-all ---
  console.warn(
    `Unexpected combination of identifiers for: ${name.substring(0, 50)} (A: ${hasA}, B: ${hasB}, C: ${hasC}) - Defaulting to JOB`,
  );
  return JobLevel.JOB; // Default to JOB for unclassified rows
}

// Helper function to get the appropriate parent ID based on the level
function getParentId(
  level: JobLevel,
  parents: Record<JobLevel, string | null>,
): string | null {
  switch (level) {
    case JobLevel.MAIN_CATEGORY:
      return null; // Main categories don't have parents
    case JobLevel.CATEGORY:
      return parents[JobLevel.MAIN_CATEGORY];
    case JobLevel.SUB_CATEGORY:
      return parents[JobLevel.CATEGORY];
    case JobLevel.JOB:
      return parents[JobLevel.SUB_CATEGORY];
    default:
      return null;
  }
}

// Example usage
const excelFilePath = path.resolve(__dirname, '../../data/jobs.xlsx');

// Check if file exists before attempting import
if (fs.existsSync(excelFilePath)) {
  importJobsFromExcel(excelFilePath).catch(console.error);
} else {
  console.error(`File not found: ${excelFilePath}`);
  console.log(`Make sure to place your Excel file at: ${excelFilePath}`);
  console.log('Or modify the script to point to the correct location.');
}
