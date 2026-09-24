import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/product.dart';
import '../../cart/providers/cart_provider.dart';
import '../../favorites/providers/favorites_provider.dart';
import '../data/products_repository.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  final String productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _imageIndex = 0;

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productDetailProvider(widget.productId));
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
                expandedHeight: 380,
                backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                surfaceTintColor: Colors.transparent,
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: _CircleIconButton(icon: Icons.arrow_back, onTap: () => Navigator.of(context).maybePop()),
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: _CircleIconButton(
                      icon: isFavorited ? Icons.favorite : Icons.favorite_border,
                      iconColor: isFavorited ? Colors.red : null,
                      onTap: () => ref.read(favoritesProvider.notifier).toggle(product),
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: ClipRRect(
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        images.isEmpty
                            ? Container(color: Theme.of(context).colorScheme.surfaceContainerHighest)
                            : PageView(
                                onPageChanged: (i) => setState(() => _imageIndex = i),
                                children: images
                                    .map((img) => CachedNetworkImage(imageUrl: img.url, fit: BoxFit.cover))
                                    .toList(),
                              ),
                        if (images.length > 1)
                          Positioned(
                            bottom: 16,
                            left: 0,
                            right: 0,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                images.length,
                                (i) => AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  margin: const EdgeInsets.symmetric(horizontal: 3),
                                  width: i == _imageIndex ? 18 : 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: i == _imageIndex ? 1 : 0.5),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Text(
                        formatMoney(product.price, product.currencyCode),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 14),
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
                      const SizedBox(height: 20),
                      Text('Description', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(product.description, style: const TextStyle(height: 1.4)),
                      const SizedBox(height: 20),
                      if (product.seller != null)
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                child: Icon(Icons.person, color: Theme.of(context).colorScheme.primary),
                              ),
                              title: Text(product.seller!.profile?.displayName ?? 'Vendeur', style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: product.seller!.profile != null
                                  ? Text('⭐ ${product.seller!.profile!.ratingAvg.toStringAsFixed(1)} · ${product.seller!.profile!.salesCount} ventes')
                                  : null,
                            ),
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
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
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

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final VoidCallback onTap;

  const _CircleIconButton({required this.icon, required this.onTap, this.iconColor});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20, color: iconColor ?? Colors.black87),
        ),
      ),
    );
  }
}
