import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/product.dart';

class ProductFilters {
  final String? search;
  final String? categoryId;
  final String? countryId;
  final String? cityId;
  final String? sellerId;
  final ProductCondition? condition;
  final int? minPrice;
  final int? maxPrice;
  final int page;

  const ProductFilters({
    this.search,
    this.categoryId,
    this.countryId,
    this.cityId,
    this.sellerId,
    this.condition,
    this.minPrice,
    this.maxPrice,
    this.page = 1,
  });

  ProductFilters copyWith({
    String? search,
    String? categoryId,
    String? countryId,
    String? cityId,
    ProductCondition? condition,
    int? minPrice,
    int? maxPrice,
    bool clearCategory = false,
    bool clearCondition = false,
    bool clearPrice = false,
  }) {
    return ProductFilters(
      search: search ?? this.search,
      categoryId: clearCategory ? null : (categoryId ?? this.categoryId),
      countryId: countryId ?? this.countryId,
      cityId: cityId ?? this.cityId,
      sellerId: sellerId,
      condition: clearCondition ? null : (condition ?? this.condition),
      minPrice: clearPrice ? null : (minPrice ?? this.minPrice),
      maxPrice: clearPrice ? null : (maxPrice ?? this.maxPrice),
    );
  }

  bool get hasActiveFilters =>
      search != null || categoryId != null || cityId != null || condition != null || minPrice != null || maxPrice != null;

  Map<String, dynamic> toQuery() => {
        'search': search,
        'categoryId': categoryId,
        'countryId': countryId,
        'cityId': cityId,
        'sellerId': sellerId,
        'condition': condition?.name,
        'minPrice': minPrice,
        'maxPrice': maxPrice,
        'page': page,
        'limit': 20,
      };
}

class ProductsPage {
  final List<Product> data;
  final int page;
  final int totalPages;

  const ProductsPage({required this.data, required this.page, required this.totalPages});

  factory ProductsPage.fromJson(Map<String, dynamic> json) => ProductsPage(
        data: (json['data'] as List<dynamic>).map((p) => Product.fromJson(p as Map<String, dynamic>)).toList(),
        page: json['meta']['page'] as int,
        totalPages: json['meta']['totalPages'] as int,
      );
}

class ProductsRepository {
  final ApiClient _api;

  ProductsRepository(this._api);

  Future<ProductsPage> search(ProductFilters filters) =>
      _api.get('/products', query: filters.toQuery(), map: (data) => ProductsPage.fromJson(asJsonMap(data)));

  Future<Product> getById(String id) => _api.get('/products/$id', map: (data) => Product.fromJson(asJsonMap(data)));
}

final productsRepositoryProvider = Provider<ProductsRepository>((ref) => ProductsRepository(ref.watch(apiClientProvider)));

final productDetailProvider = FutureProvider.family<Product, String>(
  (ref, id) => ref.watch(productsRepositoryProvider).getById(id),
);
