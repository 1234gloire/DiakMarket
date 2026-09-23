import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/product.dart';
import '../data/seller_products_repository.dart';
import '../providers/seller_products_provider.dart';

String _statusLabel(String status) => switch (status) {
      'DRAFT' => 'Brouillon',
      'ACTIVE' => 'En ligne',
      'RESERVED' => 'Réservé',
      'SOLD' => 'Vendu',
      'ARCHIVED' => 'Archivé',
      'SUSPENDED' => 'Suspendu',
      _ => status,
    };

Color _statusColor(BuildContext context, String status) => switch (status) {
      'ACTIVE' => Colors.green,
      'DRAFT' => Colors.orange,
      'SOLD' => Colors.blueGrey,
      _ => Theme.of(context).colorScheme.outline,
    };

class MyListingsScreen extends ConsumerWidget {
  const MyListingsScreen({super.key});

  Future<void> _archive(BuildContext context, WidgetRef ref, Product product) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(sellerProductsRepositoryProvider).archive(product.id);
      await ref.read(myListingsProvider.notifier).refresh();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : 'Erreur')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listingsAsync = ref.watch(myListingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes annonces')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await context.push('/seller/products/new');
          if (created == true) ref.read(myListingsProvider.notifier).refresh();
        },
        icon: const Icon(Icons.add),
        label: const Text('Publier'),
      ),
      body: listingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (products) {
          if (products.isEmpty) {
            return const Center(child: Text('Aucune annonce. Appuyez sur "Publier" pour commencer.'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(myListingsProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final product = products[index];
                final image = product.primaryImage?.url;
                return Card(
                  child: ListTile(
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: image != null
                            ? Image.network(image, fit: BoxFit.cover)
                            : Container(color: Theme.of(context).colorScheme.surfaceContainerHighest),
                      ),
                    ),
                    title: Text(product.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(formatMoney(product.price, product.currencyCode)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Chip(
                          label: Text(_statusLabel(product.status), style: const TextStyle(fontSize: 11)),
                          backgroundColor: _statusColor(context, product.status).withValues(alpha: 0.15),
                          side: BorderSide.none,
                          visualDensity: VisualDensity.compact,
                        ),
                        if (product.status == 'ACTIVE')
                          IconButton(
                            icon: const Icon(Icons.archive_outlined),
                            tooltip: 'Archiver',
                            onPressed: () => _archive(context, ref, product),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
