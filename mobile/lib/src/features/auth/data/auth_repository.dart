import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final supabaseClientProvider = Provider<SupabaseClient>((ref) => Supabase.instance.client);

/// Wraps Supabase Auth — the only piece of the app allowed to talk to Supabase directly. Every
/// other feature goes through the NestJS API (see cahier des charges §7/§9). NestJS
/// JIT-provisions the matching `users` row the first time this session's JWT reaches it.
class AuthRepository {
  final SupabaseClient _client;

  AuthRepository(this._client);

  Session? get currentSession => _client.auth.currentSession;
  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;

  Future<void> signUpWithEmail({required String email, required String password}) async {
    await _client.auth.signUp(email: email, password: password);
  }

  Future<void> signInWithEmail({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() => _client.auth.signOut();
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref.watch(supabaseClientProvider)));

final authStateChangesProvider = StreamProvider<AuthState>((ref) => ref.watch(authRepositoryProvider).onAuthStateChange);

/// True once we have a session — drives GoRouter's redirect logic.
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateChangesProvider).value;
  if (authState != null) return authState.session != null;
  return ref.watch(authRepositoryProvider).currentSession != null;
});
