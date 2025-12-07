import { PartialType } from '@nestjs/swagger';
import { CreateJobsFtDto } from './create-jobs_ft.dto';

export class UpdateJobsFtDto extends PartialType(CreateJobsFtDto) {}
