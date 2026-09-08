import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/category.dart';
import '../../../models/city.dart';
import '../../../models/country.dart';

/// Public, unauthenticated reference data (countries, cities, categories) — mirrors the
/// backend's @Public() endpoints used for multi-country configuration (§31).
class ReferenceRepository {
  final ApiClient _api;

  ReferenceRepository(this._api);

  Future<List<Country>> getCountries() =>
      _api.get('/countries', map: (data) => asJsonList(data).map(Country.fromJson).toList());

  Future<List<City>> getCities(String countryId) => _api.get(
        '/cities',
        query: {'countryId': countryId},
        map: (data) => asJsonList(data).map(City.fromJson).toList(),
      );

  Future<List<Category>> getCategories() =>
      _api.get('/categories', map: (data) => asJsonList(data).map(Category.fromJson).toList());
}

final referenceRepositoryProvider = Provider<ReferenceRepository>((ref) => ReferenceRepository(ref.watch(apiClientProvider)));

final countriesProvider = FutureProvider<List<Country>>((ref) => ref.watch(referenceRepositoryProvider).getCountries());

final categoriesProvider = FutureProvider<List<Category>>((ref) => ref.watch(referenceRepositoryProvider).getCategories());

final citiesProvider = FutureProvider.family<List<City>, String>(
  (ref, countryId) => ref.watch(referenceRepositoryProvider).getCities(countryId),
);
