import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/product.dart';
import '../data/favorites_repository.dart';

/// Holds the buyer's favorited products; other screens (product detail, home grid) read the
/// derived id set to render the heart icon state and toggle through here so it stays in sync.
class FavoritesNotifier extends AsyncNotifier<List<Product>> {
  @override
  Future<List<Product>> build() => ref.read(favoritesRepositoryProvider).getMine();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(favoritesRepositoryProvider).getMine());
  }

  Future<void> toggle(Product product) async {
    final repo = ref.read(favoritesRepositoryProvider);
    final current = state.value ?? [];
    final isFavorited = current.any((p) => p.id == product.id);

    // Optimistic update.
    state = AsyncData(isFavorited ? current.where((p) => p.id != product.id).toList() : [...current, product]);

    try {
      if (isFavorited) {
        await repo.remove(product.id);
      } else {
        await repo.add(product.id);
      }
    } catch (_) {
      state = AsyncData(current); // revert on failure
      rethrow;
    }
  }
}

final favoritesProvider = AsyncNotifierProvider<FavoritesNotifier, List<Product>>(FavoritesNotifier.new);

final favoriteIdsProvider = Provider<Set<String>>((ref) {
  final products = ref.watch(favoritesProvider).value ?? [];
  return products.map((p) => p.id).toSet();
});
