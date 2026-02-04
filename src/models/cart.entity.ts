import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @Column('jsonb')
  items: { productId: string; variant: string; quantity: number; price: number }[];

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total: number;
}