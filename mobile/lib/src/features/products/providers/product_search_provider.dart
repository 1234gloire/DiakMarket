import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/product.dart';
import '../../profile/providers/current_user_provider.dart';
import '../data/products_repository.dart';

class ProductFiltersNotifier extends Notifier<ProductFilters> {
  @override
  ProductFilters build() {
    // Re-seeds (only) the country whenever the signed-in user's country changes (e.g. right
    // after onboarding sets it); other filters are reset too, but that only happens on login,
    // refresh or an explicit country change, which is an acceptable trade-off for simplicity.
    final countryId = ref.watch(currentUserProvider).value?.countryId;
    return ProductFilters(countryId: countryId);
  }

  void setSearch(String? search) => state = state.copyWith(search: search);
  void setCategory(String? categoryId) =>
      state = categoryId == null ? state.copyWith(clearCategory: true) : state.copyWith(categoryId: categoryId);
  void setCity(String? cityId) => state = state.copyWith(cityId: cityId);
  void setCountry(String? countryId) => state = state.copyWith(countryId: countryId);
  void setCondition(ProductCondition? condition) =>
      state = condition == null ? state.copyWith(clearCondition: true) : state.copyWith(condition: condition);
  void setPriceRange(int? min, int? max) =>
      state = (min == null && max == null) ? state.copyWith(clearPrice: true) : state.copyWith(minPrice: min, maxPrice: max);
  void reset() => state = ProductFilters(countryId: state.countryId);
}

final productFiltersProvider = NotifierProvider<ProductFiltersNotifier, ProductFilters>(ProductFiltersNotifier.new);

final productSearchResultsProvider = FutureProvider<ProductsPage>((ref) {
  final filters = ref.watch(productFiltersProvider);
  return ref.watch(productsRepositoryProvider).search(filters);
});
