import 'package:dio/dio.dart';

/// Mirrors the error shape returned by the backend's AllExceptionsFilter:
/// { statusCode, code, message, path, timestamp }.
class ApiException implements Exception {
  final int? statusCode;
  final String? code;
  final String message;

  const ApiException({required this.message, this.statusCode, this.code});

  factory ApiException.fromDioError(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final rawMessage = data['message'];
      final message = rawMessage is Map<String, dynamic>
          ? (rawMessage['message']?.toString() ?? 'Une erreur est survenue')
          : (rawMessage?.toString() ?? 'Une erreur est survenue');
      return ApiException(
        message: message,
        statusCode: error.response?.statusCode,
        code: data['code'] as String?,
      );
    }
    if (error.type == DioExceptionType.connectionError || error.type == DioExceptionType.connectionTimeout) {
      return const ApiException(message: 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    }
    return ApiException(message: error.message ?? 'Une erreur réseau est survenue', statusCode: error.response?.statusCode);
  }

  @override
  String toString() => message;
}
