import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/cart.dart';

class CartRepository {
  final ApiClient _api;

  CartRepository(this._api);

  Future<Cart> getMyCart() => _api.get('/carts/me', map: (data) => Cart.fromJson(asJsonMap(data)));

  Future<Cart> addItem(String productId, int quantity) => _api.post(
        '/carts/me/items',
        body: {'productId': productId, 'quantity': quantity},
        map: (data) => Cart.fromJson(asJsonMap(data)),
      );

  Future<Cart> removeItem(String productId) =>
      _api.delete('/carts/me/items/$productId', map: (data) => Cart.fromJson(asJsonMap(data)));
}

final cartRepositoryProvider = Provider<CartRepository>((ref) => CartRepository(ref.watch(apiClientProvider)));
