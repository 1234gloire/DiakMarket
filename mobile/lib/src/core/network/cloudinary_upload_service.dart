import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'api_exception.dart';

class UploadedImage {
  final String url;
  final String publicId;
  final int? width;
  final int? height;
  final int? bytes;

  const UploadedImage({required this.url, required this.publicId, this.width, this.height, this.bytes});
}

/// Uploads directly to Cloudinary using a short-lived signature obtained from the backend
/// (`GET /products/me/upload-signature`) — the backend never sees the image bytes, only the
/// resulting metadata it's given afterwards (see cahier des charges §8).
class CloudinaryUploadService {
  final ApiClient _api;
  final Dio _cloudinaryDio = Dio();

  CloudinaryUploadService(this._api);

  Future<UploadedImage> uploadProductImage(File file) async {
    final signature = await _api.get<Map<String, dynamic>>(
      '/products/me/upload-signature',
      map: (data) => asJsonMap(data),
    );

    final cloudName = signature['cloudName'] as String;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path),
      'api_key': signature['apiKey'],
      'timestamp': signature['timestamp'],
      'signature': signature['signature'],
      'folder': signature['folder'],
    });

    try {
      final response = await _cloudinaryDio.post<Map<String, dynamic>>(
        'https://api.cloudinary.com/v1_1/$cloudName/image/upload',
        data: formData,
      );
      final body = response.data!;
      return UploadedImage(
        url: body['secure_url'] as String,
        publicId: body['public_id'] as String,
        width: body['width'] as int?,
        height: body['height'] as int?,
        bytes: body['bytes'] as int?,
      );
    } on DioException catch (e) {
      final message = e.response?.data is Map ? (e.response?.data['error']?['message']) : null;
      throw ApiException(message: message?.toString() ?? "Échec de l'envoi de la photo");
    }
  }
}

final cloudinaryUploadServiceProvider =
    Provider<CloudinaryUploadService>((ref) => CloudinaryUploadService(ref.watch(apiClientProvider)));
