import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column('jsonb')
  variants: { name: string; price: number }[];
}