import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/cart.dart';
import '../data/cart_repository.dart';

class CartNotifier extends AsyncNotifier<Cart> {
  @override
  Future<Cart> build() => ref.read(cartRepositoryProvider).getMyCart();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(cartRepositoryProvider).getMyCart());
  }

  Future<void> addItem(String productId, {int quantity = 1}) async {
    final cart = await ref.read(cartRepositoryProvider).addItem(productId, quantity);
    state = AsyncData(cart);
  }

  Future<void> removeItem(String productId) async {
    final cart = await ref.read(cartRepositoryProvider).removeItem(productId);
    state = AsyncData(cart);
  }
}

final cartProvider = AsyncNotifierProvider<CartNotifier, Cart>(CartNotifier.new);

final cartItemCountProvider = Provider<int>((ref) => ref.watch(cartProvider).value?.items.length ?? 0);
