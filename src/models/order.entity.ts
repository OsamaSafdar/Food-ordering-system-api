import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('orders')
@Index(['user'])
@Index(['id'], { unique: true })
@Index(['status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @Column('jsonb')
  items: { productId: string; variant: string; quantity: number; price: number }[];

  @Column()
  total: number;

  @Column()
  paymentType: string;

  @Column({ default: 'pending' })
  status: string;
}