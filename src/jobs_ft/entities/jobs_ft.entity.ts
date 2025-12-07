import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

export enum JobLevel {
  MAIN_CATEGORY = 'MAIN_CATEGORY',
  CATEGORY = 'CATEGORY',
  SUB_CATEGORY = 'SUB_CATEGORY',
  JOB = 'JOB',
}

@Entity('Job') // Nom exact de la table comme dans Prisma
export class JobsFt {
  @PrimaryGeneratedColumn('uuid') // Pour matcher le type cuid de Prisma
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  identifiers: string;

  @Column({
    type: 'enum',
    enum: JobLevel,
  })
  level: JobLevel;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => JobsFt, (job) => job.children)
  parent: JobsFt;

  @OneToMany(() => JobsFt, (job) => job.parent)
  children: JobsFt[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
