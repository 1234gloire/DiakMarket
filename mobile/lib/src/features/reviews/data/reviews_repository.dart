import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/review.dart';

class ReviewsRepository {
  final ApiClient _api;

  ReviewsRepository(this._api);

  Future<Review> create({
    required String orderId,
    required ReviewType type,
    required String targetId,
    String? productId,
    required int rating,
    String? comment,
  }) =>
      _api.post(
        '/reviews',
        body: {
          'orderId': orderId,
          'type': type.name,
          'targetId': targetId,
          if (productId != null) 'productId': productId,
          'rating': rating,
          if (comment != null && comment.isNotEmpty) 'comment': comment,
        },
        map: (data) => Review.fromJson(asJsonMap(data)),
      );
}

final reviewsRepositoryProvider = Provider<ReviewsRepository>((ref) => ReviewsRepository(ref.watch(apiClientProvider)));
