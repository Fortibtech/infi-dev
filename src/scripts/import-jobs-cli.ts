import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const program = new Command();

program
  .name('import-jobs')
  .description('Import jobs data from Excel file')
  .version('1.0.0')
  .requiredOption('-f, --file <path>', 'Path to Excel file containing job data')
  .option('-c, --clear', 'Clear existing job data before import', false)
  .action(async (options) => {
    try {
      // Validate that the file exists
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      // Copy the file to data directory with a standard name
      const dataDir = path.resolve(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const destPath = path.join(dataDir, 'jobs.xlsx');
      fs.copyFileSync(filePath, destPath);

      console.log(`Excel file copied to ${destPath}`);

      // Run the import script
      console.log('Starting import process...');
      const tsNodePath = path.resolve(
        __dirname,
        '../../node_modules/.bin/ts-node',
      );

      const importProcess = spawn(
        tsNodePath,
        [path.resolve(__dirname, './import-jobs.ts')],
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            CLEAR_DATA: options.clear ? 'true' : 'false',
          },
        },
      );

      importProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Job import completed successfully.');
        } else {
          console.error(`Import process exited with code ${code}`);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
