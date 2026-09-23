import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/product.dart';
import '../data/seller_products_repository.dart';

class MyListingsNotifier extends AsyncNotifier<List<Product>> {
  @override
  Future<List<Product>> build() => ref.read(sellerProductsRepositoryProvider).getMine();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(sellerProductsRepositoryProvider).getMine());
  }
}

final myListingsProvider = AsyncNotifierProvider<MyListingsNotifier, List<Product>>(MyListingsNotifier.new);
