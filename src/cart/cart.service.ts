import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../models/cart.entity';
import { User } from '../models/user.entity';
import { ProductsService } from '../products/products.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    private productsService: ProductsService,
  ) {}

  private async getOrCreateCart(user: User): Promise<Cart> {
    let cart = await this.cartRepo.findOne({ where: { user: { id: user.id } } });
    if (!cart) {
      cart = this.cartRepo.create({ user, items: [], total: 0 });
      await this.cartRepo.save(cart);
    }
    return cart;
  }

  async addItem(user: User, addDto: AddToCartDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(user);
    const product = await this.productsService.findOne(addDto.productId);
    const variant = product.variants.find(v => v.name === addDto.variant);
    if (!variant) throw new NotFoundException('Variant not found');

    const existingItem = cart.items.find(i => i.productId === addDto.productId && i.variant === addDto.variant);
    if (existingItem) {
      existingItem.quantity += addDto.quantity;
    } else {
      cart.items.push({ ...addDto, price: variant.price });
    }

    cart.total = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    return this.cartRepo.save(cart);
  }

  async updateItem(user: User, updateDto: UpdateCartItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(user);
    const item = cart.items.find(i => i.productId === updateDto.productId && i.variant === updateDto.variant);
    if (!item) throw new NotFoundException('Item not found');

    if (updateDto.quantity !== undefined) {
      if (updateDto.quantity <= 0) {
        cart.items = cart.items.filter(i => !(i.productId === updateDto.productId && i.variant === updateDto.variant));
      } else {
        item.quantity = updateDto.quantity;
      }
    }

    cart.total = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    return this.cartRepo.save(cart);
  }

  async removeItem(user: User, removeDto: UpdateCartItemDto): Promise<Cart> {
    return this.updateItem(user, { ...removeDto, quantity: 0 });
  }

  async getCart(user: User): Promise<Cart> {
    return this.getOrCreateCart(user);
  }

  async clearCart(user: User): Promise<void> {
    const cart = await this.getOrCreateCart(user);
    cart.items = [];
    cart.total = 0;
    await this.cartRepo.save(cart);
  }
}