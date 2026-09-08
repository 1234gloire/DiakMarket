import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/product.dart';
import '../../cart/providers/cart_provider.dart';
import '../../favorites/providers/favorites_provider.dart';
import '../data/products_repository.dart';

class ProductDetailScreen extends ConsumerWidget {
  final String productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(productDetailProvider(productId));
    final favoriteIds = ref.watch(favoriteIdsProvider);

    return Scaffold(
      body: productAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (product) {
          final isFavorited = favoriteIds.contains(product.id);
          final images = product.images;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 340,
                actions: [
                  IconButton(
                    icon: Icon(isFavorited ? Icons.favorite : Icons.favorite_border, color: isFavorited ? Colors.red : null),
                    onPressed: () => ref.read(favoritesProvider.notifier).toggle(product),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: images.isEmpty
                      ? Container(color: Theme.of(context).colorScheme.surfaceContainerHighest)
                      : PageView(
                          children: images
                              .map((img) => CachedNetworkImage(imageUrl: img.url, fit: BoxFit.cover))
                              .toList(),
                        ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.title, style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 8),
                      Text(
                        formatMoney(product.price, product.currencyCode),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Chip(label: Text(product.condition.label)),
                          if (product.brand != null) Chip(label: Text(product.brand!)),
                          if (product.size != null) Chip(label: Text('Taille ${product.size}')),
                          if (product.city != null) Chip(label: Text(product.city!.name)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text('Description', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 4),
                      Text(product.description),
                      const SizedBox(height: 20),
                      if (product.seller != null)
                        Card(
                          child: ListTile(
                            leading: const CircleAvatar(child: Icon(Icons.person)),
                            title: Text(product.seller!.profile?.displayName ?? 'Vendeur'),
                            subtitle: product.seller!.profile != null
                                ? Text('⭐ ${product.seller!.profile!.ratingAvg.toStringAsFixed(1)} · ${product.seller!.profile!.salesCount} ventes')
                                : null,
                          ),
                        ),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: productAsync.maybeWhen(
        data: (product) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ElevatedButton.icon(
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Ajouter au panier'),
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                try {
                  await ref.read(cartProvider.notifier).addItem(product.id);
                  messenger.showSnackBar(const SnackBar(content: Text('Ajouté au panier')));
                } catch (e) {
                  messenger.showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : "Erreur lors de l'ajout")));
                }
              },
            ),
          ),
        ),
        orElse: () => null,
      ),
    );
  }
}
