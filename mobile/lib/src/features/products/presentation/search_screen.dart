import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../models/product.dart';
import '../../../shared/widgets/product_card.dart';
import '../../reference/data/reference_repository.dart';
import '../providers/product_search_provider.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: ref.read(productFiltersProvider).search);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filters = ref.watch(productFiltersProvider);
    final resultsAsync = ref.watch(productSearchResultsProvider);
    final notifier = ref.read(productFiltersProvider.notifier);
    final citiesAsync = filters.countryId != null ? ref.watch(citiesProvider(filters.countryId!)) : null;

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Rechercher un produit...', border: InputBorder.none),
          onSubmitted: (value) => notifier.setSearch(value.trim().isEmpty ? null : value.trim()),
        ),
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                if (citiesAsync != null)
                  citiesAsync.maybeWhen(
                    data: (cities) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: DropdownMenu<String?>(
                        label: const Text('Ville'),
                        initialSelection: filters.cityId,
                        dropdownMenuEntries: [
                          const DropdownMenuEntry(value: null, label: 'Toutes les villes'),
                          ...cities.map((c) => DropdownMenuEntry(value: c.id, label: c.name)),
                        ],
                        onSelected: (value) => notifier.setCity(value),
                      ),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: DropdownMenu<ProductCondition?>(
                    label: const Text('État'),
                    initialSelection: filters.condition,
                    dropdownMenuEntries: [
                      const DropdownMenuEntry(value: null, label: 'Tous états'),
                      ...ProductCondition.values.map((c) => DropdownMenuEntry(value: c, label: c.label)),
                    ],
                    onSelected: (value) => notifier.setCondition(value),
                  ),
                ),
                if (filters.hasActiveFilters)
                  TextButton(onPressed: notifier.reset, child: const Text('Réinitialiser')),
              ],
            ),
          ),
          Expanded(
            child: resultsAsync.when(
              data: (page) {
                if (page.data.isEmpty) return const Center(child: Text('Aucun résultat.'));
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.68,
                  ),
                  itemCount: page.data.length,
                  itemBuilder: (context, index) {
                    final product = page.data[index];
                    return ProductCard(product: product, onTap: () => context.push('/product/${product.id}'));
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
            ),
          ),
        ],
      ),
    );
  }
}
