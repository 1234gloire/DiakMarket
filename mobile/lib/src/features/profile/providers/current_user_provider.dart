import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/app_user.dart';
import '../../auth/data/auth_repository.dart';
import '../data/profile_repository.dart';

class CurrentUserNotifier extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    final isAuthed = ref.watch(isAuthenticatedProvider);
    if (!isAuthed) return null;
    return ref.read(profileRepositoryProvider).getMe();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(profileRepositoryProvider).getMe());
  }

  Future<void> setCountry(String countryId) async {
    final updated = await ref.read(profileRepositoryProvider).setCountry(countryId);
    state = AsyncData(updated);
  }
}

final currentUserProvider = AsyncNotifierProvider<CurrentUserNotifier, AppUser?>(CurrentUserNotifier.new);
