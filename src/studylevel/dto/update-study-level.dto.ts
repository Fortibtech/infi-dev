import { PartialType } from '@nestjs/swagger';
import { CreateStudyLevelDto } from './create-study-level.dto';

export class UpdateStudyLevelDto extends PartialType(CreateStudyLevelDto) {}
