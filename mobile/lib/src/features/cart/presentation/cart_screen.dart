import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/money.dart';
import '../providers/cart_provider.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartAsync = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Panier')),
      body: cartAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (cart) {
          if (cart.items.isEmpty) {
            return const Center(child: Text('Votre panier est vide.'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(cartProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: cart.items.length,
              separatorBuilder: (_, __) => const Divider(),
              itemBuilder: (context, index) {
                final item = cart.items[index];
                final image = item.product.primaryImage?.url;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 56,
                      height: 56,
                      child: image != null
                          ? CachedNetworkImage(imageUrl: image, fit: BoxFit.cover)
                          : Container(color: Theme.of(context).colorScheme.surfaceContainerHighest),
                    ),
                  ),
                  title: Text(item.product.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('Qté ${item.quantity} · ${formatMoney(item.lineTotal, item.product.currencyCode)}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => ref.read(cartProvider.notifier).removeItem(item.productId),
                  ),
                );
              },
            ),
          );
        },
      ),
      bottomNavigationBar: cartAsync.maybeWhen(
        data: (cart) => cart.items.isEmpty
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatMoney(cart.total, cart.currencyCode ?? 'XOF'),
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () => context.push('/checkout'),
                        child: const Text('Passer commande'),
                      ),
                    ],
                  ),
                ),
              ),
        orElse: () => null,
      ),
    );
  }
}
