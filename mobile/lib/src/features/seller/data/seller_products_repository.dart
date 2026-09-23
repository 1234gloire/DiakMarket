import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/product.dart';

class CreateProductInput {
  final String categoryId;
  final String countryId;
  final String? cityId;
  final String title;
  final String description;
  final int price;
  final ProductCondition condition;
  final String? brand;
  final String? size;
  final String? color;
  final int quantity;

  const CreateProductInput({
    required this.categoryId,
    required this.countryId,
    required this.title,
    required this.description,
    required this.price,
    required this.condition,
    this.cityId,
    this.brand,
    this.size,
    this.color,
    this.quantity = 1,
  });

  Map<String, dynamic> toJson() => {
        'categoryId': categoryId,
        'countryId': countryId,
        if (cityId != null) 'cityId': cityId,
        'title': title,
        'description': description,
        'price': price,
        'condition': condition.name,
        if (brand != null && brand!.isNotEmpty) 'brand': brand,
        if (size != null && size!.isNotEmpty) 'size': size,
        if (color != null && color!.isNotEmpty) 'color': color,
        'quantity': quantity,
      };
}

class SellerProductsRepository {
  final ApiClient _api;

  SellerProductsRepository(this._api);

  Future<List<Product>> getMine() =>
      _api.get('/products/me/listings', map: (data) => asJsonList(data).map(Product.fromJson).toList());

  Future<Product> create(CreateProductInput input) =>
      _api.post('/products', body: input.toJson(), map: (data) => Product.fromJson(asJsonMap(data)));

  Future<Product> update(String productId, Map<String, dynamic> patch) =>
      _api.patch('/products/$productId', body: patch, map: (data) => Product.fromJson(asJsonMap(data)));

  Future<void> addImage(String productId, {required String url, required String publicId, int? width, int? height, int? bytes, bool isPrimary = false}) =>
      _api.post(
        '/products/$productId/images',
        body: {
          'url': url,
          'publicId': publicId,
          if (width != null) 'width': width,
          if (height != null) 'height': height,
          if (bytes != null) 'bytes': bytes,
          'isPrimary': isPrimary,
        },
        map: (_) {},
      );

  Future<void> removeImage(String productId, String imageId) =>
      _api.delete('/products/$productId/images/$imageId', map: (_) {});

  Future<Product> publish(String productId) => _api.post('/products/$productId/publish', map: (data) => Product.fromJson(asJsonMap(data)));

  Future<void> archive(String productId) => _api.post('/products/$productId/archive', map: (_) {});
}

final sellerProductsRepositoryProvider =
    Provider<SellerProductsRepository>((ref) => SellerProductsRepository(ref.watch(apiClientProvider)));
