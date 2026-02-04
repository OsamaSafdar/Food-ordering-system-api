import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../models/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productsRepo: Repository<Product>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepo.create(createDto);
    await this.productsRepo.save(product);
    await this.cacheManager.del('products:all');
    return product;
  }

  async findAll(): Promise<Product[]> {
    const cached = await this.cacheManager.get<Product[]>('products:all');
    if (cached) return cached;
    const products = await this.productsRepo.find();
    await this.cacheManager.set('products:all', products);
    return products;
  }

  async findOne(id: string): Promise<Product> {
    const cached = await this.cacheManager.get<Product>(`product:${id}`);
    if (cached) return cached;
    const product = await this.productsRepo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    await this.cacheManager.set(`product:${id}`, product);
    return product;
  }

  async update(id: string, updateDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateDto);
    await this.productsRepo.save(product);
    await this.cacheManager.del('products:all');
    await this.cacheManager.del(`product:${id}`);
    return product;
  }

  async delete(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepo.remove(product);
    await this.cacheManager.del('products:all');
    await this.cacheManager.del(`product:${id}`);
  }
}