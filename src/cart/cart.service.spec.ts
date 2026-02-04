import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cart } from '../models/cart.entity';
import { ProductsService } from '../products/products.service';
import { NotFoundException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let cartRepo: any;
  let productsService: any;

  const mockUser = { 
    id: 'uuid', 
    email: 'test@email.com' 
  };

  const mockProduct = {
    id: 'p1',
    name: 'Test Product',
    variants: [
      { name: 'v1', price: 10 },
      { name: 'v2', price: 15 }
    ]
  };

  const mockCart = {
    id: 'cart123',
    user: mockUser,
    items: [],
    total: 0
  };

  beforeEach(async () => {
    productsService = {
      findOne: jest.fn().mockResolvedValue(mockProduct)
    };

    cartRepo = {
      findOne: jest.fn().mockResolvedValue(mockCart),
      create: jest.fn().mockReturnValue(mockCart),
      save: jest.fn().mockResolvedValue(mockCart)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepo },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart', async () => {
      const result = await service['getOrCreateCart'](mockUser as any);
      expect(result).toEqual(mockCart);
      expect(cartRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'uuid' } }
      });
    });

    it('should create new cart if none exists', async () => {
      cartRepo.findOne.mockResolvedValueOnce(null);
      const newCart = { user: mockUser, items: [], total: 0 };
      cartRepo.create.mockReturnValueOnce(newCart);
      cartRepo.save.mockResolvedValueOnce(newCart);

      const result = await service['getOrCreateCart'](mockUser as any);
      expect(result).toEqual(newCart);
      expect(cartRepo.create).toHaveBeenCalledWith({
        user: mockUser,
        items: [],
        total: 0
      });
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', async () => {
      const addDto = { productId: 'p1', variant: 'v1', quantity: 2 };
      
      const updatedCart = {
        ...mockCart,
        items: [{ ...addDto, price: 10 }],
        total: 20
      };
      
      cartRepo.save.mockResolvedValueOnce(updatedCart);

      const result = await service.addItem(mockUser as any, addDto);
      
      expect(result.total).toBe(20);
      expect(result.items).toHaveLength(1);
      expect(productsService.findOne).toHaveBeenCalledWith('p1');
    });

    it('should update quantity if item already exists', async () => {
      const existingCart = {
        ...mockCart,
        items: [{ productId: 'p1', variant: 'v1', quantity: 1, price: 10 }],
        total: 10
      };
      
      cartRepo.findOne.mockResolvedValueOnce(existingCart);
      
      const addDto = { productId: 'p1', variant: 'v1', quantity: 2 };
      const updatedCart = {
        ...existingCart,
        items: [{ productId: 'p1', variant: 'v1', quantity: 3, price: 10 }],
        total: 30
      };
      
      cartRepo.save.mockResolvedValueOnce(updatedCart);

      const result = await service.addItem(mockUser as any, addDto);
      
      expect(result.total).toBe(30);
      expect(result.items[0].quantity).toBe(3);
    });

    it('should throw NotFoundException if variant not found', async () => {
      const addDto = { productId: 'p1', variant: 'nonexistent', quantity: 1 };
      
      await expect(
        service.addItem(mockUser as any, addDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', async () => {
      const existingCart = {
        ...mockCart,
        items: [{ productId: 'p1', variant: 'v1', quantity: 2, price: 10 }],
        total: 20
      };
      
      cartRepo.findOne.mockResolvedValueOnce(existingCart);
      
      const updateDto = { productId: 'p1', variant: 'v1', quantity: 5 };
      const updatedCart = {
        ...existingCart,
        items: [{ productId: 'p1', variant: 'v1', quantity: 5, price: 10 }],
        total: 50
      };
      
      cartRepo.save.mockResolvedValueOnce(updatedCart);

      const result = await service.updateItem(mockUser as any, updateDto);
      
      expect(result.total).toBe(50);
      expect(result.items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', async () => {
      const existingCart = {
        ...mockCart,
        items: [{ productId: 'p1', variant: 'v1', quantity: 2, price: 10 }],
        total: 20
      };
      
      cartRepo.findOne.mockResolvedValueOnce(existingCart);
      
      const updateDto = { productId: 'p1', variant: 'v1', quantity: 0 };
      const updatedCart = {
        ...existingCart,
        items: [],
        total: 0
      };
      
      cartRepo.save.mockResolvedValueOnce(updatedCart);

      const result = await service.updateItem(mockUser as any, updateDto);
      
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should throw NotFoundException if item not found', async () => {
      cartRepo.findOne.mockResolvedValueOnce(mockCart);
      
      const updateDto = { productId: 'p1', variant: 'v2', quantity: 1 };
      
      await expect(
        service.updateItem(mockUser as any, updateDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCart', () => {
    it('should return user cart', async () => {
      const result = await service.getCart(mockUser as any);
      expect(result).toEqual(mockCart);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      const cartWithItems = {
        ...mockCart,
        items: [{ productId: 'p1', variant: 'v1', quantity: 2, price: 10 }],
        total: 20
      };
      
      cartRepo.findOne.mockResolvedValueOnce(cartWithItems);
      
      const clearedCart = {
        ...cartWithItems,
        items: [],
        total: 0
      };
      
      cartRepo.save.mockResolvedValueOnce(clearedCart);

      await service.clearCart(mockUser as any);
      
      expect(cartRepo.save).toHaveBeenCalledWith(clearedCart);
    });
  });
});