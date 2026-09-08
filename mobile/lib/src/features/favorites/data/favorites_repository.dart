import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/product.dart';

class FavoritesRepository {
  final ApiClient _api;

  FavoritesRepository(this._api);

  Future<List<Product>> getMine() => _api.get(
        '/favorites',
        map: (data) => asJsonList(data).map((f) => Product.fromJson(f['product'] as Map<String, dynamic>)).toList(),
      );

  Future<void> add(String productId) => _api.post('/favorites/$productId', map: (_) {});

  Future<void> remove(String productId) => _api.delete('/favorites/$productId', map: (_) {});
}

final favoritesRepositoryProvider = Provider<FavoritesRepository>((ref) => FavoritesRepository(ref.watch(apiClientProvider)));
