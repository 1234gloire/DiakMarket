import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import 'api_exception.dart';

/// Thin wrapper around Dio that attaches the current Supabase access token to every request.
/// NestJS is the only thing that ever sees this token — the mobile app never talks to
/// business data directly, only through the API (see cahier des charges §7/§9).
class ApiClient {
  final Dio _dio;

  ApiClient()
      : _dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
        )) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final session = Supabase.instance.client.auth.currentSession;
          if (session != null) {
            options.headers['Authorization'] = 'Bearer ${session.accessToken}';
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<T> _run<T>(Future<Response<dynamic>> Function() request, T Function(dynamic data) map) async {
    try {
      final response = await request();
      return map(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? query, required T Function(dynamic data) map}) =>
      _run(() => _dio.get(path, queryParameters: _cleanQuery(query)), map);

  Future<T> post<T>(String path, {dynamic body, required T Function(dynamic data) map}) =>
      _run(() => _dio.post(path, data: body), map);

  Future<T> patch<T>(String path, {dynamic body, required T Function(dynamic data) map}) =>
      _run(() => _dio.patch(path, data: body), map);

  Future<T> delete<T>(String path, {required T Function(dynamic data) map}) =>
      _run(() => _dio.delete(path), map);

  Map<String, dynamic>? _cleanQuery(Map<String, dynamic>? query) {
    if (query == null) return null;
    final cleaned = <String, dynamic>{};
    for (final entry in query.entries) {
      if (entry.value != null) cleaned[entry.key] = entry.value;
    }
    return cleaned;
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

/// Helpers for the common "list of JSON objects" / "single JSON object" response shapes.
List<Map<String, dynamic>> asJsonList(dynamic data) =>
    (data as List<dynamic>).map((e) => e as Map<String, dynamic>).toList();

Map<String, dynamic> asJsonMap(dynamic data) => data as Map<String, dynamic>;
