enum ReviewType { BUYER_TO_SELLER, SELLER_TO_BUYER, BUYER_TO_COURIER }

class Review {
  final String id;
  final String orderId;
  final ReviewType type;
  final String targetId;
  final int rating;
  final String? comment;

  const Review({required this.id, required this.orderId, required this.type, required this.targetId, required this.rating, this.comment});

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        id: json['id'] as String,
        orderId: json['orderId'] as String,
        type: ReviewType.values.firstWhere((t) => t.name == json['type'], orElse: () => ReviewType.BUYER_TO_SELLER),
        targetId: json['targetId'] as String,
        rating: json['rating'] as int,
        comment: json['comment'] as String?,
      );
}
