import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  basePrice?: number;

  @Column('jsonb')
  variants: { name: string; price: number }[];
}