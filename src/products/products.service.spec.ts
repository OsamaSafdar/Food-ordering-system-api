import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../models/product.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
describe('ProductsService', () => {
  let service: ProductsService;
  let repo: any;
  let cache: any;

  const mockProduct = {
    id: '1',
    name: 'Burger',
    variants: [{ name: 'Single', price: 5 }, { name: 'Double', price: 8 }]
  };
  const createMockProduct = (dto: any) => {
    const product = new Product();
    Object.assign(product, dto);
    return product;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { 
          provide: getRepositoryToken(Product), 
          useValue: { 
            create: jest.fn().mockImplementation((dto) => createMockProduct(dto)),
            save: jest.fn().mockImplementation((product) => {
              if (!product.id) {
                product.id = '1';
              }
              return Promise.resolve(product);
            }),
            find: jest.fn().mockResolvedValue([mockProduct]),
            findOneBy: jest.fn().mockResolvedValue(mockProduct),
            remove: jest.fn().mockResolvedValue(undefined)
          } 
        },
        { 
          provide: CACHE_MANAGER, 
          useValue: { 
            get: jest.fn(),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined)
          } 
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get(getRepositoryToken(Product));
    cache = module.get(CACHE_MANAGER);
  });

  describe('create', () => {
    it('should create product and invalidate cache', async () => {
      const dto = {
        name: 'Burger',
        variants: [{ name: 'Single', price: 5 }],
      };

      const expectedResult = {
        id: '1',
        name: 'Burger',
        variants: [{ name: 'Single', price: 5 }],
      };

      const result = await service.create(dto);

      expect(result).toEqual(expectedResult);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
        name: dto.name,
        variants: dto.variants
      }));
      expect(cache.del).toHaveBeenCalledWith('products:all');
    });

    it('should handle variants correctly when creating', async () => {
      const dto = {
        name: 'Pizza',
        variants: [
          { name: 'Small', price: 10 },
          { name: 'Medium', price: 15 },
          { name: 'Large', price: 20 }
        ],
      };

      const result = await service.create(dto);

      expect(result.id).toBe('1');
      expect(result.name).toBe('Pizza');
      expect(result.variants).toHaveLength(3);
      expect(result.variants[0].name).toBe('Small');
      expect(result.variants[2].price).toBe(20);
    });
  });

  describe('findAll', () => {
    it('should get all products from cache if available', async () => {
      const products = [mockProduct];
      jest.spyOn(cache, 'get').mockResolvedValue(products);

      const result = await service.findAll();
      
      expect(result).toEqual(products);
      expect(cache.get).toHaveBeenCalledWith('products:all');
      expect(repo.find).not.toHaveBeenCalled();
    });

    it('should get all products from database if not in cache', async () => {
      const products = [mockProduct];
      jest.spyOn(cache, 'get').mockResolvedValue(null);

      const result = await service.findAll();
      
      expect(result).toEqual(products);
      expect(repo.find).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalledWith('products:all', products);
    });

    it('should return empty array if no products', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(repo, 'find').mockResolvedValue([]);

      const result = await service.findAll();
      
      expect(result).toEqual([]);
      expect(cache.set).toHaveBeenCalledWith('products:all', []);
    });
  });

  describe('findOne', () => {
    it('should find product by id from cache if available', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(mockProduct);
      
      const result = await service.findOne('1');
      
      expect(result).toEqual(mockProduct);
      expect(cache.get).toHaveBeenCalledWith('product:1');
      expect(repo.findOneBy).not.toHaveBeenCalled();
    });

    it('should find product by id from database if not in cache', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      
      const result = await service.findOne('1');
      
      expect(result).toEqual(mockProduct);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(cache.set).toHaveBeenCalledWith('product:1', mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(null);
      
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Product not found');
    });
  });

  describe('update', () => {
    it('should update product and invalidate cache', async () => {
      const updateDto = { 
        name: 'Updated Burger', 
        variants: [{ name: 'Triple', price: 12 }] 
      };
      const updatedProduct = { ...mockProduct, ...updateDto };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(repo, 'save').mockResolvedValue(updatedProduct);
      
      const result = await service.update('1', updateDto);
      
      expect(result).toEqual(updatedProduct);
      expect(repo.save).toHaveBeenCalledWith(updatedProduct);
      expect(cache.del).toHaveBeenCalledWith('products:all');
      expect(cache.del).toHaveBeenCalledWith('product:1');
    });

    it('should handle partial update (name only)', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedProduct = { ...mockProduct, name: 'Updated Name' };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(repo, 'save').mockResolvedValue(updatedProduct);
      
      const result = await service.update('1', updateDto);
      
      expect(result.name).toBe('Updated Name');
      expect(result.variants).toEqual(mockProduct.variants);
      expect(cache.del).toHaveBeenCalledWith('products:all');
      expect(cache.del).toHaveBeenCalledWith('product:1');
    });

    it('should handle partial update (variants only)', async () => {
      const updateDto = { 
        variants: [{ name: 'New Variant', price: 15 }] 
      };
      const updatedProduct = { ...mockProduct, variants: [{ name: 'New Variant', price: 15 }] };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(repo, 'save').mockResolvedValue(updatedProduct);
      
      const result = await service.update('1', updateDto);
      
      expect(result.variants).toEqual([{ name: 'New Variant', price: 15 }]);
      expect(result.name).toBe(mockProduct.name);
    });

    it('should throw NotFoundException if product to update not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Product not found'));
      
      await expect(service.update('nonexistent', { name: 'New' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete product and invalidate cache', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct);
      
      await service.delete('1');
      
      expect(repo.remove).toHaveBeenCalledWith(mockProduct);
      expect(cache.del).toHaveBeenCalledWith('products:all');
      expect(cache.del).toHaveBeenCalledWith('product:1');
    });

    it('should throw NotFoundException if product to delete not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Product not found'));
      
      await expect(service.delete('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('edge cases', () => {
    it('should handle empty product list', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(repo, 'find').mockResolvedValue([]);
      
      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('should handle product with single variant', async () => {
      const singleVariantProduct = {
        id: '2',
        name: 'Drink',
        variants: [{ name: 'Regular', price: 2 }]
      };
      
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(singleVariantProduct);
      
      const result = await service.findOne('2');
      expect(result.variants).toHaveLength(1);
    });

    it('should handle product with multiple variants', async () => {
      const multiVariantProduct = {
        id: '3',
        name: 'Pizza',
        variants: [
          { name: 'Small', price: 10 },
          { name: 'Medium', price: 15 },
          { name: 'Large', price: 20 }
        ]
      };
      
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(multiVariantProduct);
      
      const result = await service.findOne('3');
      expect(result.variants).toHaveLength(3);
      expect(result.variants[0].name).toBe('Small');
      expect(result.variants[2].price).toBe(20);
    });
  });
});