import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/address.dart';

class AddressesRepository {
  final ApiClient _api;

  AddressesRepository(this._api);

  Future<List<Address>> getMine() =>
      _api.get('/addresses/me', map: (data) => asJsonList(data).map(Address.fromJson).toList());

  Future<Address> create({
    required String countryId,
    String? cityId,
    String? label,
    required String line1,
    String? line2,
    bool isDefault = false,
  }) =>
      _api.post(
        '/addresses',
        body: {
          'countryId': countryId,
          if (cityId != null) 'cityId': cityId,
          if (label != null) 'label': label,
          'line1': line1,
          if (line2 != null) 'line2': line2,
          'isDefault': isDefault,
        },
        map: (data) => Address.fromJson(asJsonMap(data)),
      );
}

final addressesRepositoryProvider = Provider<AddressesRepository>((ref) => AddressesRepository(ref.watch(apiClientProvider)));

class AddressesNotifier extends AsyncNotifier<List<Address>> {
  @override
  Future<List<Address>> build() => ref.read(addressesRepositoryProvider).getMine();

  Future<Address> create({
    required String countryId,
    String? cityId,
    String? label,
    required String line1,
    String? line2,
    bool isDefault = false,
  }) async {
    final address = await ref.read(addressesRepositoryProvider).create(
          countryId: countryId,
          cityId: cityId,
          label: label,
          line1: line1,
          line2: line2,
          isDefault: isDefault,
        );
    state = await AsyncValue.guard(() => ref.read(addressesRepositoryProvider).getMine());
    return address;
  }
}

final addressesProvider = AsyncNotifierProvider<AddressesNotifier, List<Address>>(AddressesNotifier.new);
