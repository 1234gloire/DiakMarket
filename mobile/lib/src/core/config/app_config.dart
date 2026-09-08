import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Reads runtime configuration from the bundled .env (see .env.example).
/// SUPABASE_ANON_KEY is public-safe by design; the service role key must never appear here.
class AppConfig {
  AppConfig._();

  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  static String get apiBaseUrl => dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:3000/api/v1';

  static Future<void> load() => dotenv.load(fileName: '.env');
}
