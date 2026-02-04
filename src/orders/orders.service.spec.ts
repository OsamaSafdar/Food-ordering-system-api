import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../models/order.entity';
import { Cart } from '../models/cart.entity';  // ADD THIS IMPORT
import { CartService } from '../cart/cart.service';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: any;
  let cartRepo: any;  // ADD THIS VARIABLE
  let cartService: any;
  let queue: any;
  let dataSource: any;

  const mockUser = {
    id: 'uuid-test',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+923001234567',
    password: 'hashedpassword123',
  };

  const mockCartWithItems = {
    id: 'cart-uuid',
    user: mockUser,
    items: [{ productId: 'p1', variant: 'v1', quantity: 2, price: 10 }],
    total: 20,
  };

  const mockEmptyCart = {
    id: 'cart-uuid',
    user: mockUser,
    items: [],
    total: 0,
  };

  beforeEach(async () => {
    // Initialize cartRepo mock
    cartRepo = {
      // Add any methods used by OrdersService if needed
      find: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    orderRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    cartService = {
      getCart: jest.fn().mockResolvedValue(mockCartWithItems),
      clearCart: jest.fn(),  // Add if your service uses it
    };

    queue = {
      emit: jest.fn(),
      send: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          save: jest.fn().mockImplementation((entity) =>
            Promise.resolve({ 
              id: 'order-12345', 
              ...entity 
            }),
          ),
          findOne: jest.fn().mockImplementation((entityClass, options) => {
            if (entityClass === Cart) {
              return Promise.resolve({
                ...mockCartWithItems,
                items: [],
                total: 0,
              });
            }
            return Promise.resolve(null);
          }),
          find: jest.fn(),
          remove: jest.fn(),
          create: jest.fn(),
        };
        return cb(manager);
      }),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
      },
      createQueryRunner: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Cart), useValue: cartRepo },  // ADD THIS LINE
        { provide: CartService, useValue: cartService },
        { provide: DataSource, useValue: dataSource },
        { provide: 'ORDER_QUEUE', useValue: queue },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('placeOrder', () => {
    it('should create order, save in transaction, emit to queue', async () => {
      const dto = { paymentType: 'card' };

      const result = await service.placeOrder(mockUser as any, dto as any);

      expect(result).toMatchObject({
        id: 'order-12345',
        user: mockUser,
        items: mockCartWithItems.items,
        total: mockCartWithItems.total,
        paymentType: 'card',
        status: 'pending',
      });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(queue.emit).toHaveBeenCalledWith('process_order', {
        orderId: 'order-12345',
        userEmail: mockUser.email,
        userPhone: mockUser.phone,
      });
    });

    it('should include correct items and total in saved order', async () => {
      const dto = { paymentType: 'cash' };

      const result = await service.placeOrder(mockUser as any, dto as any);

      expect(result.items).toEqual(mockCartWithItems.items);
      expect(result.total).toBe(mockCartWithItems.total);
      expect(queue.emit).toHaveBeenCalledWith('process_order', {
        orderId: 'order-12345',
        userEmail: mockUser.email,
        userPhone: mockUser.phone,
      });
    });

    it('should throw BadRequestException when cart is empty', async () => {
      cartService.getCart.mockResolvedValueOnce(mockEmptyCart);

      const promise = service.placeOrder(
        mockUser as any,
        { paymentType: 'cash' } as any,
      );

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Cart is empty');

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(queue.emit).not.toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        { id: 'o1', total: 20, status: 'pending' },
        { id: 'o2', total: 45, status: 'completed' },
      ];

      orderRepo.find.mockResolvedValue(mockOrders);

      const result = await service.getOrders(mockUser as any);

      expect(result).toEqual(mockOrders);
      expect(orderRepo.find).toHaveBeenCalledWith({
        where: { user: { id: mockUser.id } },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status when order exists', async () => {
      const existing = { id: 'o123', status: 'pending' };

      orderRepo.findOneBy.mockResolvedValue(existing);
      orderRepo.save.mockResolvedValue({ ...existing, status: 'paid' });

      const result = await service.updateStatus('o123', 'paid');

      expect(result.status).toBe('paid');
      expect(orderRepo.findOneBy).toHaveBeenCalledWith({ id: 'o123' });
      expect(orderRepo.save).toHaveBeenCalledWith({ ...existing, status: 'paid' });
    });

    it('should throw when order not found', async () => {
      orderRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateStatus('xyz', 'paid'),
      ).rejects.toThrow('Order not found');
      
      expect(orderRepo.findOneBy).toHaveBeenCalledWith({ id: 'xyz' });
    });
  });
});