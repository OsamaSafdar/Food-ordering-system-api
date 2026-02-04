import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  @Exclude()  // Excluding from serialization
  password: string;

  @Column('simple-array', { nullable: true })
  @Exclude()
  tokens?: string[];

  @Column({ default: 'user' })
  role: string;
}