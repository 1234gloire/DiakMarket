import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/app_user.dart';

class ProfileRepository {
  final ApiClient _api;

  ProfileRepository(this._api);

  Future<AppUser> getMe() => _api.get('/users/me', map: (data) => AppUser.fromJson(asJsonMap(data)));

  Future<void> updateProfile({String? displayName, String? bio}) => _api.patch(
        '/users/me/profile',
        body: {
          if (displayName != null) 'displayName': displayName,
          if (bio != null) 'bio': bio,
        },
        map: (_) {},
      );

  Future<AppUser> setCountry(String countryId) => _api.patch(
        '/users/me/country',
        body: {'countryId': countryId},
        map: (data) => AppUser.fromJson(asJsonMap(data)),
      );
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) => ProfileRepository(ref.watch(apiClientProvider)));
